import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

// TODO handle being called with an ID that doesn't exist
export const getEDoc = query({
    args: {
        // id: v.id("eDocs"),
        id: v.string(),
    },
    handler: async (ctx, args) => {
        // TODO: action compression / base state

        // similar to example code in convex's blog (even the promise.all)
        // can also replace with convex helpers package https://stack.convex.dev/functional-relationships-helpers
        const actionIdsForDoc = await ctx.db
            .query("eDocActionPairs")
            .withIndex("by_doc", (q) => q.eq("docId", args.id)) // WHERE docId = args.id
            .order("asc") // orders by creation time. oldest first
            .collect();
        const actionIds = actionIdsForDoc.map((pair) => pair.actionId);
        const actions = await Promise.all(actionIds.map((id) => ctx.db.get(id)));

        // TODO: see what other doc IDs an action was for
        
        return {
            EActions: actions,
        };
    },
});


export const addEDocAction = mutation({
    args: {
        actionData: v.string(),
        docIds: v.array(v.string()),
    },
    handler: async (ctx, args) => {
        // mutations run transitionally with "true serializability"
        const userId = await getAuthUserId(ctx);
        
        const actionId = await ctx.db.insert("eActions", {
            actionData: args.actionData,
            creatorId: userId ?? undefined,
        });

        for (const docId of args.docIds) {
            await ctx.db.insert("eDocActionPairs", {
                docId,
                actionId,
            });
        }
    },
});

export const clearEDoc = mutation({
    args: {
        docId: v.string(),
    },
    handler: async (ctx, args) => {
        const actionIds = await ctx.db.query("eDocActionPairs")
            .withIndex("by_doc", (q) => q.eq("docId", args.docId))
            .collect();
        for (const actionId of actionIds) {
            await ctx.db.delete(actionId._id);
            await ctx.db.delete(actionId.actionId);
        }
    },
});
