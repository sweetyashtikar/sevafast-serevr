const mongoose = require('mongoose')
const express = require('express');
const router = express.Router();
const { emailService } = require('../utils/sendmail');
const { issueReferralReward } = require('../utils/referral');

router.patch('/:model/:id', async (req, res) => {
    try {
        const { model, id } = req.params
        const { newStatus } = req.body

        const modelName = model.charAt(0).toUpperCase() + model.slice(1)
        const TargetModel = mongoose.model(modelName);

        if (!TargetModel) {
            return res.status(404).json({ success: false, message: "Model not found" });
        }
        //send the email notification about status change to the user/vendor saying
        //  that the status is true and can use the website now
        // Get current document
        const currentDoc = await TargetModel.findById(id);
        if (!currentDoc) return res.status(404).json({ success: false, message: `Record not found in ${modelName}` });

        const isApprovingUser = modelName === 'User' && newStatus === true && currentDoc.status !== true;

        if (isApprovingUser) {
            if (!currentDoc.email) {
                return res.status(400).json({ success: false, message: "User does not have an email address." });
            }
            // 1. Try sending the email first
            const emailResult = await emailService.sendApprovalEmail(currentDoc);
            if (!emailResult.success) {
                return res.status(500).json({ success: false, message: `Failed to send approval email: ${emailResult.error}` });
            }
        }
            const updateStatus = await TargetModel.findByIdAndUpdate(
                id,
                {
                    status: newStatus,
                    ...(isApprovingUser && { emailSent: true })
                },
                { new: true, runValidators: true }
            )

            // Trigger referral reward if approving a user
            if (isApprovingUser) {
                await issueReferralReward(id);
            }
            if (!updateStatus) {
                return res.status(404).json({
                    success: false,
                    message: `Record not found in ${modelName}`
                });
            }

            res.status(200).json({
                success: true,
                message: `${modelName} status updated to ${newStatus}`,
                data: updateStatus
            });
        
    }catch (error) {
            console.log(error)
            res.status(500).json({ success: false, message: error.message });
        }
    })

module.exports = router;

