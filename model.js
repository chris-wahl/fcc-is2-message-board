const mongoose = require('mongoose');
mongoose.connect(process.env['DB'], {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false
});

const replySchema = new mongoose.Schema({
        text: {
            type: String,
            required: true
        },
        delete_password: {
            type: String,
            required: true
        },
        reported: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: {
            createdAt: 'created_on',
            updatedAt: 'bumped_on'
        }
    });

const threadSchema = new mongoose.Schema({
    board: {
        type: String,
        required: true
    },
    text: {
        type: String,
        required: true
    },
    delete_password: {
        type: String,
        required: true
    },
    replies: {
        type: [replySchema],
        default: []
    },
    reported: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: {
        createdAt: 'created_on',
        updatedAt: 'bumped_on'
    }
})

module.exports = new mongoose.model('Thread', threadSchema);
