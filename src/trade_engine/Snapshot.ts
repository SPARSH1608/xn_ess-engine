import mongoose ,{Schema,Document} from "mongoose";

import type { User } from "./types.js";
import { getSnapshot ,users} from "./Data.js";

const SnapshotSchema =new Schema({
    ts:{type:Date,default:Date.now},
    snapshot:{type:Array,required:true}
})
 const snapshotModel=mongoose.model("Snapshot",SnapshotSchema )
const snapshot=snapshotModel
export async function saveSnapShot(){
    
    const snap=getSnapshot()
    await snapshot.create({snapshot:snap})
    console.log('snap created ')
}

export function restoreSnap(s:User[]){
    console.log('restoring')
    for(const key of Object.keys(users)){
        delete users[key]
    }
    for(const user of s){
        users[user.userId]=user
    }
}
export async function loadSnapShot(){
    const snap=await snapshot.findOne().sort({ts:-1}).exec()
    console.log('snap',snap)
    if(snap && snap.snapshot){
        restoreSnap(snap.snapshot as User[])
        console.log('restored snap')
    }else{
        console.log('something went wrong during restoring snap')
    }
}