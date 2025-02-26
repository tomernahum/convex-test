

// this is simple version, later I will implement offline mode
// later I will also implement wrapper api with stuff like createDoc(reducerFuncs); transact(()=>doc1.action(params);...;)


type Reducers<State> = {
    [key: string]: (state: State, params: any) => State;
};
type BasicAction = {
    name: string
    params: any
}


// do we need schema?

export function createDocument<State, R extends Reducers<State>>(params: {
    id: string;
    initialState: State;
    reducers: R;
}) {
    //
}

function doAction<DocIds extends string[]>(
    docIds: DocIds, 
    action: BasicAction<DocIds[number]>
){

}