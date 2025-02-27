//@ts-nocheck


// API 1
const doc = defineDocument({
    initialState: {
        messages: [] as string[],
        count: 0,
    },
    reducers: {
        incrementCount: (current)=>{
            return {
                ...current,
                count: current.count + 1
            }
        },
        setCount: (current, newCount)=>{
            return {
                ...current,
                count: newCount
            }
        }
    }
})
doc.incrementCount()
doc.setCount(5)

transact(()=>{
    // possible??
    // I was thinking define an action....
    const count = doc.getState().count
    doc2.setCount(count)

})

/* 
action" 

*/

action: {
    docs, params, resolver
}
