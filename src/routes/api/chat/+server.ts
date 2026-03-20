import { json, type RequestHandler } from '@sveltejs/kit';
import { AgentService } from '$lib/services/agent';

// Store agent instances per session (simple in-memory storage)
const agentInstances = new Map<string, AgentService>();

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const { message, sessionId } = await request.json();

		if (!message || typeof message !== 'string') {
			return json({ error: 'Message is required' }, { status: 400 });
		}

		// Get or create agent instance for this session
		let agent = agentInstances.get(sessionId);
		if (!agent) {
			agent = new AgentService();
			agentInstances.set(sessionId, agent);
		}

		// Send message and get response
		const response = await agent.sendMessage(message);

		return json(response);
	} catch (error) {
		console.error('API error:', error);
		return json(
			{ error: 'An error occurred while processing your message' },
			{ status: 500 }
		);
	}
};

export const DELETE: RequestHandler = async ({ request }) => {
	try {
		const { sessionId } = await request.json();

		if (sessionId && agentInstances.has(sessionId)) {
			agentInstances.delete(sessionId);
		}

		return json({ success: true });
	} catch (error) {
		return json({ error: 'Failed to reset session' }, { status: 500 });
	}
};
