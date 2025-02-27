
// type DocId = string;

// type Action = {
//     actionName: string,
//     actionParams: any,
//     docsToRunOn: DocId[],
// }

// type Schema<
//     Actions extends Record<string, Action>,
// > = {
//     actions: Actions
// }

// function createSchema<Actions extends Record<string, Action>>(
//     schema: Schema<Actions>
// ) {
//     //    
// }

//-----




type ActionBase<
    DocTypes extends string[],
    DocTypesItCanRunOn extends DocTypes
> = {
    actionName: string,
    actionParams: any,
    docTypesItCanRunOn: DocTypesItCanRunOn
}

type Schema2<
    DocTypes extends string[],
    Actions extends Array<ActionBase<DocTypes, DocTypes>>
> = {
    docTypes: DocTypes
    actions: Actions
}

function createX<
    DocTypes extends string[],
    Actions extends Array<ActionBase<DocTypes, DocTypes>>,
    S extends Schema2<DocTypes, Actions>
>(x:S){
    return x
}


const x = createX({
    docTypes: ["docType1", "docType2", "docType3"] as const,
    actions: [{
        actionName: "action1",
        actionParams: 1,
        docTypesItCanRunOn: ["docType1", "what"],
    }],
} as const)


function createY<
    DocTypes extends string, // eg "dt1" | "dt2"
    Actions extends Array<{
        actionName: string,
        actionParams: any,
        docTypesItCanRunOn: DocTypes[]
    }>,
>(p: {docTypes: DocTypes[], actions: Actions}){
    return p
}

const y = createY({
    docTypes: ["dt1", "dt2", "dt3", "dt4"],
    actions: [{
        actionName: "action1",
        actionParams: 1, // this should be setting a type...
        docTypesItCanRunOn: ["dt1", "dt2", "dt4", "oops"],
    }],
} as const)


type SchemaZ<
    ValidDocType extends string, // eg "dt1" | "dt2"
    ValidAction extends {
        actionName: string,
        actionParams: any,
        docTypesItCanRunOn: ValidDocType[]
    }
> = {
    docTypes: ValidDocType[], actions: ValidAction[]
}

// Sidenote:
// Each doc has a set of actions just for it
// I want to be able to send multiple actions across multiple docs in one atomic transaction
// I also maybe ideally want to be able to see from an action what other docs an action's transaction affected

// 1 idea for this: make actions multi-doc, different docs can define different resolvers for the same exact actions
// then if you want to do multiple actions transactionally, you actually just make them into one action that runs on 2 docs. this would either be defined by the user making their own action or done automatically



/* 
    Ideas:
    1) 
    resolver(docId[], actionName) -> docState[]
    
    doc1 hears about a new action on multiple docs, must fetch doc2 in order to run the resolver properly

    2) 
    resolver(docId, actionName) -> docState
    doc1 hears about a new action on multiple docs. But it has the code to apply it to itself (doesn't ever need to read from the other doc)

    combination?): do 1 when transaction involves reading from referenced, do 2 otherwise?

    Major usecase of multidoc atomic actions:
    moving content: delete content from doc1 + add content to doc2
    doc1: movingAwayFrom(contentToDelete); doc2: movingTo(contentToAdd)
    fine without cross doc transactions (still atomic at the server / source of truth level)
    what wouldn't be?

    what about sumDocs(d1, d2, d3) => d3.count = d1.count + d2.count
    could just run it as setD3CountAction(precomputedVal)
    but what if d1 and d2 count change before it gets to d3?
    Honestly I think its probably fine for my usecase?
        we could also write action to d1 and d2 saying "note we did an addition"
        we could maybe implement more guarantees in the resolver level if we're willing to reject stuff

    wait what about moveDoc again?
    what if doc1 and/or 2 contents change before the moving action is committed?
    well the function will still run with the same params in both places

    what about transfer count: reset doc1 count to 0, and set doc2 count to doc1:
    for our use case we could probably make it fault tolerant by instead saying subtract count /  add count. 
    what if it's bank balance sheesh, and we are transfering money? 
    the transfer would go through, but what if another transfer worms its way beforehand, and we run out of balance

    acc1: $10
    acc2: $0
    acc3: $0

    transfer acc1->acc2
    transfer acc1->acc3

    within each acc we will get a consistent order
    acc1:
        transfer->acc3
        transfer->acc2 // transaction now fails, even though it was made thinking it wouldn't fail
    acc2:
        transferFrom<-acc1 // how will it know that it failed, unless the transaction resolved together


    // if we do resolve together, is that enough?

    we have global ordering of actions in the db, but client can only look at so many of them. queries them by doc he's interested in. then for any actions that need to be resolved with state of another doc, that other doc's actions are fetched. but what if that other doc relies on more docs? then more fetched... uh oh
        this can be exposed to server if want (it can infer similar anyway), so maybe it can be encoded in a select & join query
    but we end up with one globally ordered list of actions, and we resolve them in order one at a time, everything will be consistent across clients and such
    

    goal of my system is mostly just to have consistent state, not correct state across docs. the use case is editing text and stuff not banking. but would be cool to support banking too while we are at it. 
    but could an equivalent thing cause problems IRL? Yes? eg removing a section of document that has since changed
        I think we could implement it within seperate doc actions with a strategy like optimistic concurrency (reject action if the input state for it is not what it expected and make the caller retry it)
        and the naive/starter implementation is just to try to make it understanding 
            ie doc1.removeStuff(1-11), doc2.addStuff("Hello World")
            could get confused
            doc1.removeStuff(1-11, "Hello World"), doc2.addStuff("Hello World")
            what if hello world is now missing?
                well maybe it would be nice to move the stuff that replaced it into doc2, or at least have the option 
                    could be bullets
                or we could just lose those edits honestly and just remove that text and add it to doc2. 
                or we can fail the transaction doc1, but how do we tell doc2 to fail too?
                    could resolve actions together as one obviously
                    could tell server-running transaction to reject the action if the expected-previous-action is not the same
                        might be really hard for someone to move a subitem that is being edited, but that would never really happen (i mean for bullets the id would be stored seperatly than the action probably.... wait no it would want to be the same cause encryption, )
            what if you move something in/out of a shared doc into/from a non-shared doc. then multidoc action can't even run. I guess we have to take the l of an action sneaking in before the move action. we would have to either fail the moveaction or lose some data (like 1 second worth of data if its anything but an offlineMerge). not that bad honestly
            we would want to do it with that doc but in this case the user can't see that doc, and the server can't either, and the user who can see both docs (who originated the change) might be offline or something. we can reject their change and make them retry. or could we ask them for the new resolvation logic? that is basically the same thing


    types
    - send multiple actions (transactionally)
    - send multidoc action (needs both docs to work)
        probably will not support, at least for now

    - send multiple actions transactionally, but reject them all if previousaction is not what sender expected it to be for one of the action's docs 
        (aka previousState is not what expected to be, but without revealing state)
        reveals something to server but hopefully not a problem, also server could have inferred like 100% what you think the latest action is (it is the one who told you about it) so it ~~doesn't really reveal anything actually~~
        but it does reveal that you care, that you are doing a specific type of action that uses that functionality
        - if the code for your app is open source / known to server, and only some of your actions require that, it will know when you are/aren't doing those actions.
        Example: if mergefromoffline is only one where you do that, then server knows when you mergefromoffline
        if moveBulletBetweenDoc is, then server knows when you are doing that
        it could also be more important, or more important than you realize, and you might not realize this problem exists....

        server already knows when an action affects 2 docs (so it can atomic it) (hmm can we have it be atomic and not know for sure that it's tied? probably)
        so maybe we make all actions that affect 2 docs like this for prev values of both docs?
        damn more tradeoffs huh
        we could also not support any gaurentees about 2 docs


*/


/* 
    Random Side explanation about offline model:

    When you call an action, it either goes:
    - to the global data model (if you're online)
    - to your local data model (if you're offline)
    then once you're online you will merge your local data into the global data
    this merge will be it's own action. you will do the merge and then reset your local data model to the global model which is just what happened online while you were offline + your merge
    your merge action can be created using your local model including history of local actions, but the local actions themselves will not be made canonical


*/