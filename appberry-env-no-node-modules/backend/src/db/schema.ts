// -----------------------------------------------------------------------------
// NOTE
//
// This file contains your database schema definitions. Feel free to add
// additional tables here!
//
// Remember to run `pnpm drizzle-kit generate` after modifying this file to
// create a new migration. Drizzle generates DDL statements for you, so you
// don't need to worry about writing migrations yourself. See the docs for
// details: https://github.com/vercel/drizzle-orm/blob/main/docs/drizzle-kit/FAQ.md
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const dummyTable = sqliteTable('dummy', {
	id: text('id').primaryKey(),
	description: text('description').notNull(),
});

// -----------------------------------------------------------------------------
// USER TABLE
//
// Users are uniquely identified by their name. When a new player enters the
// game we insert a new record keyed off of the provided name. The table holds
// a reference to the creature's image stored in R2 (`creatureImage`), basic
// statistics and any unlocked abilities. Feel free to extend this schema later
// (e.g. storing evolution points or additional stats).
export const usersTable = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  creatureImage: text('creatureImage'),
  health: integer('health').notNull().default(100),
  attack: integer('attack').notNull().default(10),
  defense: integer('defense').notNull().default(5),
  speed: integer('speed').notNull().default(5),
  abilities: text('abilities'), // JSON encoded array
  evolutionPoints: integer('evolutionPoints').notNull().default(0),
});

// -----------------------------------------------------------------------------
// BATTLE TABLE
//
// Battles (both boss and multiplayer) are persisted in this table. Each row
// contains a serialized game state stored as JSON. This simplifies keeping
// track of ongoing matches without modeling nested structures. Feel free to
// expand this record into separate columns if you need more granular control.
export const battlesTable = sqliteTable('battles', {
  id: text('id').primaryKey(),
  state: text('state').notNull(),
});
