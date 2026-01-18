const mongoose = require('mongoose')
const express = require('express');
const router = express.Router();

router.patch('/:model/:id' , async (req,res)=>{
    try{
    const {model, id} = req.params 
    const {status} = req.body 

    const modelName = model.charAt(0).toUpperCase() + model.slice(1)

    const TargetModel = mongoose.model(modelName);

    if (!TargetModel) {
        return res.status(404).json({ success: false, message: "Model not found" });
    }

    const updateStatus = await TargetModel.findByIdAndUpdate(
        id,
        {status, status},
        {new :true, runValidators : true}
    )
    if (!updateStatus) {
        return res.status(404).json({ 
            success: false, 
            message: `Record not found in ${modelName}` 
        });
    }

    res.status(200).json({
            success: true,
            message: `${modelName} status updated to ${status}`,
            data: updateStatus
        });
    }catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
})

module.exports = router;

