const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET'
}

export default {
	async fetch(request, env) {
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: CORS_HEADERS })
		}

		const res = await fetch(
			`https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate`,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${env.TURN_API_TOKEN}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ ttl: 86400 })
			}
		)

		const data = await res.json()

		return new Response(JSON.stringify(data), {
			headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
		})
	}
}
