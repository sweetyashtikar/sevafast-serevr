const getHomeSliders = async (req, res) => {
    try {
        const sliders = await Slider.find().lean();

        const populatedSliders = await Promise.all(sliders.map(async (slider) => {
            if (slider.type === 'products') {
                slider.data = await mongoose.model('Product').findById(slider.type_id).select('name price');
            } else if (slider.type === 'categories') {
                slider.data = await mongoose.model('Category').findById(slider.type_id).select('name');
            }
            return slider;
        }));

        res.status(200).json(populatedSliders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};