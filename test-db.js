import { initDB, deleteFavorite, getDeletedItemIds } from './src/lib/db.ts';

async function test() {
  await initDB();
  await deleteFavorite("test_id");
  const deleted = await getDeletedItemIds();
  console.log("Deleted items:", deleted);
}
test();
