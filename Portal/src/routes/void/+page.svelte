<script lang="ts">
  import { onMount } from "svelte";
  import {
    StarBackground,
    Constellation,
    VoidMessage,
    CosmicInput,
    FragmentDetail,
  } from "$lib/components";
  import { conversationStore, visualStore } from "$lib/stores";
  import type { Fragment, Message, Star } from "$lib/types/agent";
  import {
    localeStore,
    detectLanguage,
    getTranslation,
    type Locale,
  } from "$lib/i18n";

  function createMessage(
    role: "user" | "assistant",
    content: string,
    fragment?: Fragment,
  ): Message {
    return {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: Date.now(),
      fragment,
    };
  }

  let sessionId = $state("");
  let currentLocale = $state($localeStore);
  let t = $derived(getTranslation(currentLocale));
  let selectedFragment = $state<Fragment | null>(null);

  type VoidPhase =
    | "greeting"
    | "waiting-input"
    | "loading"
    | "assistant-speaking";
  let phase = $state<VoidPhase>("greeting");
  let lastAssistantMessage = $state<Message | null>(null);
  let messageKey = $state(0);
  let allMessages = $state<Message[]>([]);

  let currentVisualState = $state($visualStore);
  let currentConversation = $state($conversationStore);

  $effect(() => {
    const unsub1 = visualStore.subscribe((v) => (currentVisualState = v));
    const unsub2 = conversationStore.subscribe(
      (v) => (currentConversation = v),
    );
    const unsub3 = localeStore.subscribe((v) => (currentLocale = v));
    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  });

  onMount(() => {
    sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localeStore.initialize();
    fetchOpeningQuestion();
  });

  async function fetchOpeningQuestion() {
    phase = "loading";

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "__START__",
          sessionId,
          locale: currentLocale,
        }),
      });

      const data = await response.json();

      const greetingMessage = createMessage("assistant", data.message);
      conversationStore.addMessage(greetingMessage);
      lastAssistantMessage = greetingMessage;
      allMessages = [greetingMessage];
      messageKey++;
      phase = "waiting-input";
    } catch (error) {
      console.error("Failed to get opening question:", error);
      const fallbackMessage = createMessage(
        "assistant",
        t.openingQuestions[
          Math.floor(Math.random() * t.openingQuestions.length)
        ],
      );
      conversationStore.addMessage(fallbackMessage);
      lastAssistantMessage = fallbackMessage;
      allMessages = [fallbackMessage];
      messageKey++;
      phase = "waiting-input";
    }
  }

  function handleSendMessage(message: string) {
    if (!message.trim()) return;

    const detectedLocale = detectLanguage(message);
    if (detectedLocale && detectedLocale !== currentLocale) {
      localeStore.setLocale(detectedLocale);
    }

    const userMessage = createMessage("user", message);
    conversationStore.addMessage(userMessage);
    allMessages = [...allMessages, userMessage];

    phase = "loading";
    fetchAssistantResponse();
  }

  function handleMessageComplete() {
    phase = "waiting-input";
  }

  async function fetchAssistantResponse() {
    conversationStore.setLoading(true);

    try {
      const lastUserMessage = [...currentConversation.messages]
        .reverse()
        .find((m) => m.role === "user");

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: lastUserMessage?.content || "",
          sessionId,
          locale: currentLocale,
        }),
      });

      const data = await response.json();

      if (data.toolResults) {
        processToolResults(data.toolResults);
      }

      const newMessage = createMessage(
        "assistant",
        data.message,
        data.fragment,
      );
      conversationStore.addMessage(newMessage);

      lastAssistantMessage = newMessage;
      allMessages = [...allMessages, newMessage];
      messageKey++;
      phase = "assistant-speaking";
    } catch (error) {
      console.error("Failed to send message:", error);
      conversationStore.setError(t.error.connectionFailed);
      phase = "waiting-input";
    } finally {
      conversationStore.setLoading(false);
    }
  }

  function processToolResults(
    results: Array<{ tool: string; success: boolean; data?: unknown }>,
  ) {
    for (const result of results) {
      if (!result.success) continue;

      const data = result.data as Record<string, unknown>;

      switch (result.tool) {
        case "release_fragment":
          if (data.fragment) {
            createStarForFragment(data.fragment as Fragment);
          }
          break;

        case "create_constellation":
          visualStore.addLine(data.star1Id as string, data.star2Id as string);
          break;
      }
    }
  }

  function createStarForFragment(fragment: Fragment) {
    const x = 100 + Math.random() * (window.innerWidth - 200);
    const y = 100 + Math.random() * (window.innerHeight - 400);

    const starId = visualStore.addStar({
      x,
      y,
      size: 3 + Math.random() * 2,
      brightness: 0.8 + Math.random() * 0.2,
      fragmentId: fragment.id,
      fragment,
      twinkleSpeed: 2 + Math.random() * 2,
    });

    selectedFragment = fragment;

    const stars = currentVisualState.stars;
    if (stars.length > 1) {
      const lastStar = stars[stars.length - 2];
      visualStore.addLine(lastStar.id, starId);
    }
  }

  function handleStarClick(fragment: Fragment, _star: Star) {
    selectedFragment = fragment;
  }

  function handleCloseFragmentDetail() {
    selectedFragment = null;
  }

  let latestAssistant = $derived(
    [...allMessages].reverse().find((m) => m.role === "assistant"),
  );
</script>

<svelte:head>
  <title>{t.ui.pageTitle}</title>
  <meta name="description" content={t.ui.pageDescription} />
</svelte:head>

<div class="app-container">
  <StarBackground />
  <Constellation onstarclick={handleStarClick} />

  <div class="content-layer">
    <div class="dialogue-container">
      <div class="message-area">
        {#if latestAssistant}
          <VoidMessage
            key={messageKey}
            message={latestAssistant}
            oncomplete={handleMessageComplete}
          />
        {/if}

        {#if phase === "loading"}
          <div class="loading-container">
            <div class="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        {/if}
      </div>
    </div>

    <CosmicInput
      disabled={phase === "loading"}
      onsubmit={handleSendMessage}
      placeholder={t.ui.inputPlaceholder}
      loadingText={t.ui.loadingText}
    />
  </div>

  {#if selectedFragment}
    <FragmentDetail
      fragment={selectedFragment}
      onclose={handleCloseFragmentDetail}
      {t}
    />
  {/if}
</div>

<style>
  .app-container {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background: #0a0a0f;
  }

  .content-layer {
    position: relative;
    z-index: 10;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .dialogue-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding-bottom: 120px;
    overflow-y: auto;
  }

  .message-area {
    width: 100%;
    max-width: 700px;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 200px;
  }

  .loading-container {
    display: flex;
    justify-content: center;
    padding: 2rem;
  }

  .loading-dots {
    display: flex;
    gap: 8px;
  }

  .loading-dots span {
    width: 8px;
    height: 8px;
    background: rgba(139, 92, 246, 0.6);
    border-radius: 50%;
    animation: bounce 1.4s infinite ease-in-out both;
  }

  .loading-dots span:nth-child(1) {
    animation-delay: -0.32s;
  }
  .loading-dots span:nth-child(2) {
    animation-delay: -0.16s;
  }

  @keyframes bounce {
    0%,
    80%,
    100% {
      transform: scale(0);
    }
    40% {
      transform: scale(1);
    }
  }

  @media (max-width: 640px) {
    .dialogue-container {
      padding-bottom: 100px;
    }
    .message-area {
      padding: 1rem;
    }
  }
</style>
