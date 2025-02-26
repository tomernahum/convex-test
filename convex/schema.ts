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
    // docId: v.id("eDocs"),
    docId: v.string(),
    allDocIds: v.array(v.string()), // other docs for which an identical copy of this action was applied
    
    actionData: v.string(),
    creatorId: v.optional(v.id("users")), // TODO: make one that clients can verify without trusting the server
  }).index("by_doc", ["docId"]),

  // maybe. would be same as eActions except we don't compress the actions. can then eventually delete really old actions, and can query by time or since_action
  // eActionArchive: defineTable({
  //   docId: v.string(),
  //   allDocIds: v.array(v.string()), // other docs for which an identical copy of this action was applied
    
  //   actionData: v.string(),
  //   creatorId: v.optional(v.id("users")),
  // }).index("by_doc", ["docId"]),

});
