import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export default function Thing() {

    const docId = "123";

    const { docState, actions } = useEDocQuery(docId);
    const { doAction } = useDoAction();
    const { doCompression } = useCompressAction(docId);
    
    const clearEDocMutation = useMutation(api.eDocFunctions.clearEDoc);

    console.log("actions", actions);
    console.log("docState", docState);

    function doTestAction(){
        doAction({ actionName: "test", actionParams: {randVal: Math.random()} }, [docId]);
    }
    function clearTestMessages(){
        doAction({ actionName: "clearTestMessages", actionParams: { } }, [docId]);
    }
    function doIncrementAction(){
        doAction({ actionName: "increment", actionParams: { } }, [docId]);
    }
    function clearEDoc(){
        clearEDocMutation({ docId });
    }

    return <div>
        <pre>
            {JSON.stringify(docState?.testMessages, null, 2)}
        </pre>
        <button onClick={doTestAction}>
            Test
        </button>
        <button onClick={clearTestMessages} className="ml-2">
            Clear Messages
        </button>
        <button onClick={clearEDoc} className="ml-2">
            Clear Doc
        </button>
        <p>Counter: {docState?.counter}</p>
        <button onClick={doIncrementAction}>
            Increment
        </button>
        <br />
        <button onClick={doCompression} className="mt-2">
            Compress Doc
        </button>
    </div>;
}

type DAction = {
    actionName: string;
    actionParams?: Record<string, any>;
};

function useEDocQuery(id: string) {
    const docId = id; // todo, handle the case where the doc with id doesn't exist
    const queryResult = useQuery(api.eDocFunctions.getEDoc, { id: docId });

    const actions = queryResult?.EActions || []; // TODO. reconsider what to do if no actions

    const actionData = actions
        .map((action) => action?.actionData)
        .filter((actionData) => actionData !== undefined);

    // TODO: real encryption/decryption
    const decryptedActionData = actionData.map((actionData) =>
        JSON.parse(actionData),
    );

    // TODO: actually validate action data
    const validatedActionData = decryptedActionData.map(
        (actionData) => actionData as DAction,
    );
    
    const docState = validatedActionData.reduce((acc, action) => {
        return resolveAction(acc, action);
    }, null as DocState);

    return {
        docState,
        actions: validatedActionData,
        fullActions: actions,
    };
}

function useDoAction(){

    const doActionMutation = useMutation(api.eDocFunctions.addEDocAction);

    function doAction(actionData: {actionName: string, actionParams?: Record<string, any>}, docIds: string[]){
        const encryptedActionData = JSON.stringify(actionData); // TODO: real encryption
        doActionMutation({ actionData: encryptedActionData, docIds }); // also implicitly passes on authState
    }
    
    return {
        doAction,
    };
}

function useCompressAction(id: string){

    const {docState, fullActions} = useEDocQuery(id);

    const compressActionMutation = useMutation(api.eDocFunctions.compressEDoc);

    function doCompression(){
        // Todo: needs thorough testing & consideration
        const newDocState: DocState = docState;
        const lastAction = fullActions[fullActions.length - 1];
        
        const action:DAction = {
            actionName: "_setDoc",
            actionParams: {
                newDocState: newDocState
            }
        }
        const encryptedActionData = JSON.stringify(action);

        compressActionMutation({
            docId: id,
            lastActionId: lastAction._id,
            setAction: encryptedActionData
        });
    }
    return {
        doCompression,
    };
}

// todo, proper framework/composability
type DocState = {
    testMessages: DAction[];
    counter: number;
} | null;

const actionResolvers = {
    _initDoc: (docState: DocState, action: DAction) => {
        if (docState !== null) {
            return docState;
        }
        return { testMessages: [], counter: 0 };
    },
    _setDoc: (docState: DocState, action: DAction) => {
        const newDocState = action.actionParams.newDocState as DocState; // TODO, proper typing
        if (!newDocState) {
            throw new Error("Invalid newDocState");
        }
        return newDocState;
    },

    test: (docState: DocState, action: DAction) => {
        if (!docState) {
            docState = actionResolvers._initDoc(null, action);
        }

        let testMessages = docState.testMessages || [];
        testMessages.push(action);
        return { ...docState, testMessages };
    },
    clearTestMessages: (docState: DocState, action: DAction) => {
        if (!docState) {
            docState = actionResolvers._initDoc(null, action);
        }
        console.log("Clearing test messages");
        return { ...docState, testMessages: [] };
    },
    increment: (docState: DocState, action: DAction) => {
        if (!docState) {
            docState = actionResolvers._initDoc(null, action);
        }
        return { ...docState, counter: docState.counter + 1 };
    },
} as const;

// TODO: implement properly
function resolveAction(acc: DocState, action: DAction) {
    const actionName = action.actionName;
    const actionResolver = actionResolvers[actionName as keyof typeof actionResolvers];

    if (!actionResolver) {
        console.error(`Unsupported action: ${actionName}. Skipped applying it.`);
        return acc;
    }

    const newState: DocState = actionResolver(acc, action);

    return newState;
}