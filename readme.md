

Convex has done one part of the system I've trying to build:
1) a simple to use fullstack library for consistent/deterministic realtime state
2) \+ make it e2ee, + offline-supporting

convex has done the first part it seems. \
But, It was built with the goal of realtime apps in mind, not e2ee apps. with e2ee apps the server should not be able to understand the data. so my system still needs to be a seperate system, but it could make sense to build it on top of convex as a primitive

why I need to build my own query & mutation logic on top of convex's ones:

lets say we are making an app with a global counter. lets say 2+ people press the "+1" button at the same time. the logic that a computer does to do this is: {read counter; compute counter + 1; write counter}

the naive solution might lead to race conditions if multiple increment actions are happening at the same time. So the field of databases and related stuff have developed all sorts of methods that provide aAtomicty, C, I & D & some other stuff, to varying levels as well. Convex uses OCC + deterministic transactions to achieve this. I am not an expert on this. (I have started reading&listening to some of "designing data intensive systems" by martin kleppmann, pretty good so far). \
but yeah the model of most acid databases and of convex is transactions, where you can read and write multiple things in a transaction and it will be as if they all ran together without interuption or overlapping.  \
the problem with the way convex achieves this, and probably most databases is that the transaction logic has to run on the server \
-- wait i actually don't know if thats actually true! I was assuming that! I think it might not be true? \
anyways assuming its true, for my thing concurrent conflicting actions need to be resolved on the client since the server can not view them in plain text and thus can not do the + 1 action, without seeing what the data is. mindblowingly It actually is possible with Fully Homomorphic Encryption (FHE), but i am afraid I will not be able to implement that in practice, though it is worth looking into more - instead I am using traditional e2ee with all logic done by the clients on decrypted data.\
So if 2 of my things do simultanious actions, it needs to be resolved/serialized on the client. 

I have come up with the scheme, inspired by crdts and other stuff, to make documents = append only lists of actions, then to view the doc clients resolve the actions deterministically & same across all clients to produce actual doc state. docs will be small enough that this will be feasable (docs are closer to sql rows than to tables). each transaction actually will be resolved sequentially, no appearance-of necessary. all we need the server to do is maintain a canonical ordering of doc actions (and we could probably get client to do that too with p2p eventually), plus actually store all the data. then the actual action resolverers can do a naive strategy and at least state will be consistent for all participants (good enough for live google docs for example), or the action resolvers can do fancy stuff like rejecting the action if the starting docstate is not what it expected it to be. 

convex literally has the same kind of scheme with deterministic queries and mutations / transactions, except the server does the action resolvation computation, and runs stuff in parallel while giving the illusion of running sequentially

anyways yeah. I'm going to look up if transactions really need to run in the server or even in the db, I was assuming they do but that can't be right. could the client stream in a transaction, and does that mean my system is not needed somehow?



\
\
\
\
\
\
\



//one problem with convex is it's for-profit/VC-backed lol, but they do have open source / self hostable version (+ i haven't tested it thoroughly im just taking there word that the transactions are very good)
