import type { Migration } from "./run.js";

const migration: Migration = {
  id: "013-add-facebook-groups-result-source",
  async up(query) {
    await query(`ALTER TYPE result_source ADD VALUE IF NOT EXISTS 'facebook_groups'`);
  }
};

export default migration;
