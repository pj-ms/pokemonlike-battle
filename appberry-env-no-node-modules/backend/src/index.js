import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import { dummyTable } from './db/schema';
import { usersTable, battlesTable } from './db/schema';
const app = new Hono();
app.use('*', cors({
    origin: (_origin, c) => c.env.CORS_ORIGIN,
    credentials: true,
}));
// Existing routes are provided for demonstration purposes only.
// API routes must ALWAYS be prefixed with /api, to differentiate them from routes that should serve the frontend's static assets.
const routes = app
    .get('/api', async (c) => {
    return c.text('Hello World!');
})
    // $ curl -X POST "http://localhost:8787/api/echo" -H "Content-Type: application/json" -d '{"field1": "value1", "field2": 5}'
    // {"field1":"value1","field2":5}
    .post('/api/echo', zValidator('json', z.object({
    field1: z.string(),
    field2: z.number(),
})), async (c) => {
    const { field1, field2 } = c.req.valid('json');
    return c.json({ field1, field2 });
})
    .get('/api/d1-demo', async (c) => {
    const db = drizzle(c.env.DB);
    await db.delete(dummyTable).where(eq(dummyTable.id, 'test_id'));
    // Should not typically write data in a GET route. This is for demonstration purposes only.
    await db.insert(dummyTable).values({ id: 'test_id', description: 'test description' });
    const result = await db.select().from(dummyTable);
    return c.json(result);
});
export default app;
// -----------------------------------------------------------------------------
// Custom API Endpoints
//
// Here we register the remainder of our RESTful API surface. Feel free to expand
// these handlers with additional validation or state transitions as your game
// grows in complexity. The endpoints below encapsulate everything from
// user creation to match orchestration.
// Utility: decode a base64 string into a Uint8Array
function decodeBase64(data) {
    const binary = atob(data.replace(/^data:image\/[a-z]+;base64,/, ''));
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}
// Static boss definitions. Feel free to extend this list or load from a
// configuration file. Images reference the official Pokémon sprites for
// illustrative purposes.
const bosses = [
    {
        id: 'charizard',
        name: 'Charizard',
        health: 150,
        attack: 20,
        defense: 10,
        speed: 15,
        abilities: [
            { name: 'Flame Thrower', damage: 20 },
            { name: 'Wing Attack', damage: 15 },
            { name: 'Fire Spin', damage: 18 },
        ],
        image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png',
    },
    {
        id: 'blastoise',
        name: 'Blastoise',
        health: 180,
        attack: 18,
        defense: 15,
        speed: 12,
        abilities: [
            { name: 'Hydro Pump', damage: 22 },
            { name: 'Water Gun', damage: 12 },
            { name: 'Tackle', damage: 8 },
        ],
        image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/9.png',
    },
    {
        id: 'venusaur',
        name: 'Venusaur',
        health: 170,
        attack: 17,
        defense: 12,
        speed: 11,
        abilities: [
            { name: 'Vine Whip', damage: 15 },
            { name: 'Razor Leaf', damage: 14 },
            { name: 'Solar Beam', damage: 25 },
        ],
        image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/3.png',
    },
];
// POST /api/enter
// Create or fetch a user by name. Users are keyed solely on the provided name.
app.post('/api/enter', async (c) => {
    const body = await c.req.json();
    const { name } = body;
    if (!name) {
        return c.json({ error: 'Name is required' }, 400);
    }
    const db = drizzle(c.env.DB);
    const existing = await db.select().from(usersTable).where(eq(usersTable.name, name)).get();
    if (existing) {
        return c.json(existing);
    }
    // Default abilities
    const defaultAbilities = JSON.stringify([
        { name: 'Punch', damage: 10 },
        { name: 'Kick', damage: 8 },
        { name: 'Heal', damage: 0, heal: 10 },
    ]);
    const result = await db.insert(usersTable).values({ name, abilities: defaultAbilities }).returning();
    const user = result[0];
    return c.json({ ...user, abilities: JSON.parse(user.abilities) });
});
// GET /api/user?name=foo
// Fetch a user. The returned object includes a parsed `abilities` array.
app.get('/api/user', async (c) => {
    const name = c.req.query('name');
    if (!name) {
        return c.json({ error: 'Name is required' }, 400);
    }
    const db = drizzle(c.env.DB);
    const existing = await db.select().from(usersTable).where(eq(usersTable.name, name)).get();
    if (!existing) {
        return c.json({ error: 'User not found' }, 404);
    }
    return c.json({
        ...existing,
        abilities: existing.abilities ? JSON.parse(existing.abilities) : [],
    });
});
// POST /api/saveCreature
// Persist the canvas image into R2 and attach the resulting key to the user.
// Body format: { name: string, image: string (base64) }
app.post('/api/saveCreature', async (c) => {
    const body = await c.req.json();
    const { name, image } = body;
    if (!name || !image) {
        return c.json({ error: 'Name and image are required' }, 400);
    }
    const db = drizzle(c.env.DB);
    const user = await db.select().from(usersTable).where(eq(usersTable.name, name)).get();
    if (!user) {
        return c.json({ error: 'User not found' }, 404);
    }
    const key = `${name}-${Date.now()}.png`;
    const bytes = decodeBase64(image);
    await c.env.IMAGES.put(key, bytes, {
        httpMetadata: { contentType: 'image/png' },
    });
    await db.update(usersTable).set({ creatureImage: key }).where(eq(usersTable.name, name));
    const updatedUser = await db.select().from(usersTable).where(eq(usersTable.name, name)).get();
    return c.json({
        ...updatedUser,
        abilities: updatedUser?.abilities ? JSON.parse(updatedUser.abilities) : [],
    });
});
// GET /api/image/:key
// Retrieve an image stored in R2. Keys may contain dots or dashes.
app.get('/api/image/:key', async (c) => {
    const key = c.req.param('key');
    // Fetch the object from R2. Do not specify the `type` option here because
    // R2.get() signatures do not allow it. By default you'll get an object with
    // `.body` and optional `httpMetadata`.
    const object = await c.env.IMAGES.get(key);
    if (!object) {
        return c.text('Not found', 404);
    }
    const contentType = object.httpMetadata?.contentType || 'image/png';
    return new Response(object.body, {
        headers: {
            'Content-Type': contentType,
        },
    });
});
// GET /api/bosses
// Return the static boss definitions. Clients may extend this list on their side but
// centralizing the source of truth here keeps your frontend simple.
app.get('/api/bosses', async (c) => {
    return c.json(bosses);
});
// POST /api/startBossBattle
// Kick off a new fight against a boss. The server determines the first turn
// based on speed.
app.post('/api/startBossBattle', async (c) => {
    const body = await c.req.json();
    const { name, bossId } = body;
    if (!name || !bossId) {
        return c.json({ error: 'Name and bossId are required' }, 400);
    }
    const db = drizzle(c.env.DB);
    const user = await db.select().from(usersTable).where(eq(usersTable.name, name)).get();
    if (!user) {
        return c.json({ error: 'User not found' }, 404);
    }
    const boss = bosses.find((b) => b.id === bossId);
    if (!boss) {
        return c.json({ error: 'Boss not found' }, 404);
    }
    const id = crypto.randomUUID();
    // Build the initial state
    const state = {
        id,
        type: 'boss',
        players: [
            {
                name: user.name,
                creatureImage: user.creatureImage,
                health: user.health,
                attack: user.attack,
                defense: user.defense,
                speed: user.speed,
                abilities: user.abilities ? JSON.parse(user.abilities) : [],
            },
            boss,
        ],
        turn: user.speed >= boss.speed ? 0 : 1,
        status: 'ongoing',
        log: [],
    };
    await db.insert(battlesTable).values({ id, state: JSON.stringify(state) });
    return c.json(state);
});
// POST /api/playMove
// Apply a player's move in a boss fight. The server handles the boss's counter.
app.post('/api/playMove', async (c) => {
    const body = await c.req.json();
    const { id, abilityIndex } = body;
    if (!id || abilityIndex === undefined) {
        return c.json({ error: 'Battle id and ability index are required' }, 400);
    }
    const db = drizzle(c.env.DB);
    const row = await db.select().from(battlesTable).where(eq(battlesTable.id, id)).get();
    if (!row) {
        return c.json({ error: 'Battle not found' }, 404);
    }
    const state = JSON.parse(row.state);
    if (state.status !== 'ongoing') {
        return c.json(state);
    }
    // Only player (index 0) initiates moves via this endpoint
    if (state.turn !== 0) {
        return c.json({ error: 'Not your turn' }, 400);
    }
    const player = state.players[0];
    const boss = state.players[1];
    const ability = player.abilities[abilityIndex];
    if (!ability) {
        return c.json({ error: 'Invalid ability index' }, 400);
    }
    // Apply player's ability
    let logEntry = `${player.name} uses ${ability.name}! `;
    let damage = (ability.damage || 0) + player.attack - boss.defense;
    if (damage < 0)
        damage = 0;
    boss.health -= damage;
    logEntry += `It deals ${damage} damage to ${boss.name}. `;
    state.log.push(logEntry);
    // Check for victory
    if (boss.health <= 0) {
        state.status = 'finished';
        state.winner = player.name;
        await db.update(battlesTable).set({ state: JSON.stringify(state) }).where(eq(battlesTable.id, id));
        return c.json(state);
    }
    // Boss counter-attack
    const bossAbility = boss.abilities[Math.floor(Math.random() * boss.abilities.length)];
    let bossLog = `${boss.name} uses ${bossAbility.name}! `;
    let bossDamage = (bossAbility.damage || 0) + boss.attack - player.defense;
    if (bossDamage < 0)
        bossDamage = 0;
    player.health -= bossDamage;
    bossLog += `It deals ${bossDamage} damage to ${player.name}.`;
    state.log.push(bossLog);
    if (player.health <= 0) {
        state.status = 'finished';
        state.winner = boss.name;
    }
    // Always set next turn to player
    state.turn = 0;
    await db.update(battlesTable).set({ state: JSON.stringify(state) }).where(eq(battlesTable.id, id));
    return c.json(state);
});
// POST /api/createMatch
// Generate a short code representing a new multiplayer session.
app.post('/api/createMatch', async (c) => {
    const body = await c.req.json();
    const { name } = body;
    if (!name) {
        return c.json({ error: 'Name is required' }, 400);
    }
    const db = drizzle(c.env.DB);
    const user = await db.select().from(usersTable).where(eq(usersTable.name, name)).get();
    if (!user) {
        return c.json({ error: 'User not found' }, 404);
    }
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    const state = {
        id: code,
        type: 'multiplayer',
        players: [
            {
                name: user.name,
                creatureImage: user.creatureImage,
                health: user.health,
                attack: user.attack,
                defense: user.defense,
                speed: user.speed,
                abilities: user.abilities ? JSON.parse(user.abilities) : [],
            },
        ],
        turn: 0,
        status: 'lobby',
        log: [],
    };
    await db.insert(battlesTable).values({ id: code, state: JSON.stringify(state) });
    return c.json({ code });
});
// POST /api/joinMatch
// Allow a second player to join an existing multiplayer session.
app.post('/api/joinMatch', async (c) => {
    const body = await c.req.json();
    const { name, code } = body;
    if (!name || !code) {
        return c.json({ error: 'Name and code are required' }, 400);
    }
    const db = drizzle(c.env.DB);
    const existingStateRow = await db.select().from(battlesTable).where(eq(battlesTable.id, code)).get();
    if (!existingStateRow) {
        return c.json({ error: 'Match not found' }, 404);
    }
    const state = JSON.parse(existingStateRow.state);
    if (state.players.length >= 2) {
        return c.json({ error: 'Match already has two players' }, 400);
    }
    const user = await db.select().from(usersTable).where(eq(usersTable.name, name)).get();
    if (!user) {
        return c.json({ error: 'User not found' }, 404);
    }
    const player2 = {
        name: user.name,
        creatureImage: user.creatureImage,
        health: user.health,
        attack: user.attack,
        defense: user.defense,
        speed: user.speed,
        abilities: user.abilities ? JSON.parse(user.abilities) : [],
    };
    state.players.push(player2);
    // Decide who starts based on speed; if equal randomize
    if (state.players[0].speed > state.players[1].speed) {
        state.turn = 0;
    }
    else if (state.players[1].speed > state.players[0].speed) {
        state.turn = 1;
    }
    else {
        state.turn = Math.random() < 0.5 ? 0 : 1;
    }
    state.status = 'ongoing';
    await db.update(battlesTable).set({ state: JSON.stringify(state) }).where(eq(battlesTable.id, code));
    return c.json(state);
});
// POST /api/playMultiplayerMove
// Apply a move in a multiplayer match. Use the player's name to determine whose turn it is.
app.post('/api/playMultiplayerMove', async (c) => {
    const body = await c.req.json();
    const { id, name, abilityIndex } = body;
    if (!id || !name || abilityIndex === undefined) {
        return c.json({ error: 'Match id, name and ability index are required' }, 400);
    }
    const db = drizzle(c.env.DB);
    const row = await db.select().from(battlesTable).where(eq(battlesTable.id, id)).get();
    if (!row) {
        return c.json({ error: 'Match not found' }, 404);
    }
    const state = JSON.parse(row.state);
    if (state.status !== 'ongoing') {
        return c.json(state);
    }
    const playerIndex = state.players.findIndex((p) => p.name === name);
    if (playerIndex === -1) {
        return c.json({ error: 'Player not found in match' }, 400);
    }
    if (state.turn !== playerIndex) {
        return c.json({ error: 'Not your turn' }, 400);
    }
    const attacker = state.players[playerIndex];
    const defender = state.players[1 - playerIndex];
    const ability = attacker.abilities[abilityIndex];
    if (!ability) {
        return c.json({ error: 'Invalid ability index' }, 400);
    }
    let logEntry = `${attacker.name} uses ${ability.name}! `;
    let damage = (ability.damage || 0) + attacker.attack - defender.defense;
    if (damage < 0)
        damage = 0;
    defender.health -= damage;
    logEntry += `It deals ${damage} damage to ${defender.name}.`;
    state.log.push(logEntry);
    // Check victory
    if (defender.health <= 0) {
        state.status = 'finished';
        state.winner = attacker.name;
        await db.update(battlesTable).set({ state: JSON.stringify(state) }).where(eq(battlesTable.id, id));
        return c.json(state);
    }
    // Switch turn
    state.turn = 1 - state.turn;
    await db.update(battlesTable).set({ state: JSON.stringify(state) }).where(eq(battlesTable.id, id));
    return c.json(state);
});
// GET /api/getBattleState?id=...
// Enables clients to poll the current state of a boss or multiplayer fight
app.get('/api/getBattleState', async (c) => {
    const id = c.req.query('id');
    if (!id) {
        return c.json({ error: 'id is required' }, 400);
    }
    const db = drizzle(c.env.DB);
    const row = await db.select().from(battlesTable).where(eq(battlesTable.id, id)).get();
    if (!row) {
        return c.json({ error: 'Battle not found' }, 404);
    }
    return c.json(JSON.parse(row.state));
});
