import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
// The schema provides more precise TypeScript types.
export default defineSchema({
  ...authTables,
  numbers: defineTable({
    value: v.number(),
  }),

  // TODO. convex does work without a schema
  eDocs: defineTable({
    name: v.string(),
  }),
  
  eActions: defineTable({
    actionData: v.string(),
    creatorId: v.optional(v.id("users")), // TODO: make one that clients can verify without trusting the server
  }),

  // eBaseStates: defineTable({
  //   stateData: v.string(),
  // }),
  
  // we could get rid of eActions and just put it in here, copying it when we get it (we have to copy id anyway to insert in here)
  eDocActionPairs: defineTable({
    // docId: v.id("eDocs"),
    docId: v.string(),
    actionId: v.id("eActions"),
  }).index("by_doc", ["docId"]),
});
