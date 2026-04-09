const axios = require('axios');

async function getInventory(steamId) {
	const url = 'http://steamcommunity.com/inventory/${steamId}/730/2?l=english&count=5000';
	const response = await axios.get(url);
	return response.data;
}

async function getInventoryHistory(steamId, apiKey) {
	return null;Ö
}