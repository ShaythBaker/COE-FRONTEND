// path: src/helpers/list_items_helper.js
import { get } from "./api_helper";
import { LIST_ITEMS } from "./url_helper";

/**
 * GET /list-items?LIST_KEY=...
 * Returns array of list-items.
 */
export const fetchListItems = async (listKey) => {
  const key = encodeURIComponent(listKey);
  return get(`${LIST_ITEMS}?LIST_KEY=${key}`);
};