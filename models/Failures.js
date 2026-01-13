const mongoose=require('mongoose');
const { assign } = require('nodemailer/lib/shared');

const failureSchema=new mongoose.Schema({
    failureId:{
        type:String,
        required:true,
        unique:true,
    },
    machineId:{
        type:String,
        required:true,
    },
    machineType:{
        type:String,
        required:true,
        trim:true,
    },
    machineName:{
        type:String,
        required:true,
        trim:true,
    },
    Description:{
        type:String,
        required:true,
    },
    AssignedTo:{
        type:String,
        required:true,
    },
    SeverityLevel:{
        type:String,
        enum :['Low','Medium','Critical'],
        default: 'Low',
    },
    DateReported:{
        type:Date,
        default:Date.now,
    },
    ReportedBy:{
        type:String,
        required:true,
    },
    
    });
module.exports=mongoose.model('Failure',failureSchema);