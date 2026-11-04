import type { Core } from "@strapi/strapi";

const UID = "api::sequence.sequence";

/**
 * Reserves `count` numbers from a named counter and returns the first one.
 *
 * The increment is a single UPDATE ... SET value = value + n, so two requests
 * can never be handed the same number, on SQLite or PostgreSQL. Called inside a
 * transaction it joins that transaction, so a failed save gives the numbers back.
 */
export async function reserveSequence(strapi: Core.Strapi, name: string, count = 1): Promise<number> {
  const table = strapi.db.metadata.get(UID).tableName;

  return strapi.db.transaction(async ({ trx }) => {
    const updated = await strapi.db
      .getConnection(table)
      .transacting(trx)
      .where({ name })
      .update({ value: strapi.db.connection.raw("?? + ?", ["value", count]) });

    if (updated) {
      const row = await strapi.db.query(UID).findOne({ where: { name } });
      return Number(row.value) - count + 1;
    }

    await strapi.db.query(UID).create({ data: { name, value: count } });
    return 1;
  });
}
