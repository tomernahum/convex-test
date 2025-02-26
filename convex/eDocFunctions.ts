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
        const actions = await ctx.db
            .query("eActions")
            .withIndex("by_doc", (q) => q.eq("docId", args.id)) // WHERE docId = args.id
            .order("asc") // orders by creation time. oldest first
            .collect();
        
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
        const userId = await getAuthUserId(ctx);
        
        // copy the action into each doc
        // mutations in convex are transactional with "true serializability", so it should all fail if one fails
        for (const docId of args.docIds) {
            await ctx.db.insert("eActions", {
                docId: docId,
                allDocIds: args.docIds,
                actionData: args.actionData,
                creatorId: userId ?? undefined,
            });
        }
    },
});

// clears all actions for a doc
export const clearEDoc = mutation({
    args: {
        docId: v.string(),
    },
    handler: async (ctx, args) => {
        const actionIds = await ctx.db.query("eActions")
            .withIndex("by_doc", (q) => q.eq("docId", args.docId))
            .collect();
        for (const actionId of actionIds) {
            await ctx.db.delete(actionId._id);
        }
    },
});



// TODO:  right now we turn all actions into a single _set action. we could also have a seperate table for this, that would enable storing mutliple set actions, plus more set action metadata. in fact I should do that TODO   would also make easier to keep the original action metadata and not have to redefine sent-time. although maybe we want to redefine sent time so that it can be encrypted so that an uncompromised server doesn't store it
export const compressEDoc = mutation({
    args: {
        docId: v.string(),
        lastActionId: v.id("eActions"),
        setAction: v.string(),
    },
    handler: async (ctx, args) => {
        // mutations in convex are atomic and transactional with "true serializability". so this won't get interrupted and partially committed (pretty sure)
        
        

        // get doc actions
        const actions = await ctx.db
            .query("eActions")
            .withIndex("by_doc", (q) => q.eq("docId", args.docId)) // WHERE docId = args.id
            .order("asc") // orders by creation time. oldest first.
            .collect();

        // split into before and after args.last
        const actionsToSquash: typeof actions = []
        const actionsToKeep: typeof actions = []
        let squashing = true
        for (const action of actions) {
            if (squashing) {
                actionsToSquash.push(action)
            } else {
                actionsToKeep.push(action)
            }
            if (action._id === args.lastActionId) {
                squashing = false
            }
        }


        // TODO: keep storing squashed actions in case we want the info 
            // maybe copy it over on squash or write it to both tables when creating the action
        
        // delete all actions
        actions.forEach((action) => {
            ctx.db.delete(action._id);
        })

        // insert the setAction
        ctx.db.insert("eActions", {
            docId: args.docId,
            allDocIds: [args.docId],
            actionData: args.setAction,
            creatorId: await getAuthUserId(ctx) ?? undefined,
            // TODO: other metadata?
        })

        // insert remaining unsquashed actions
        actionsToKeep.forEach((action) => {
            ctx.db.insert("eActions", {
                docId: args.docId,
                allDocIds: [args.docId],
                actionData: action.actionData,
                creatorId: action.creatorId,
            })
        })
    },
});



// TO VERIFY: .order('asc') gives consistent results every time in case of actions at exact same time

// TODO. there is a max document size, convex enforces it. We should enforce it too and give warnings and stuff!