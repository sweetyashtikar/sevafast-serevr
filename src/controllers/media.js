const uploadMedia = async (req, res) => {
    // req.file contains information from Multer
    const newMedia = await Media.create({
        seller_id: req.user._id,
        title: req.body.title || req.file.originalname,
        name: req.file.filename,
        extension: req.file.mimetype.split('/')[1],
        type: req.file.mimetype.split('/')[0],
        sub_directory: 'uploads/media/2026/',
        size: req.file.size
    });

    res.status(201).json({ success: true, media: newMedia });
};