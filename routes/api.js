'use strict';
const assert = require('chai').assert
const MSG = require('../constants');
const ObjectId = require('mongodb').ObjectId;
const Thread = require('../model');
const {hashPassword, checkPassword} = require('../crypto');


module.exports = function (app) {

    app.route('/api/threads/:board')
        .post(async function (req, res) {
            const {board} = req.params;
            const {text, delete_password} = req.body;
            const newThread = new Thread({
                board, text,
                delete_password: await hashPassword(delete_password)
            });
            await newThread.save();
            return res.redirect('/b/' + newThread.board + '/' + newThread._id);
        })
        .put(async function (req, res) {
            try {
                const {board} = req.params;
                const _id = ObjectId(req.body.report_id);

                assert.isNotNull(
                    await Thread.findOneAndUpdate({board, _id}, {reported: true}).select({_id: 1})
                );
                return res.send(MSG.REPORT);
            } catch {
                return res.send('error');
            }
        })
        .delete(async function (req, res) {
            try {
                const {board} = req.params;
                const {delete_password, thread_id} = req.body;
                const _id = ObjectId(thread_id);

                const thread = await Thread.findOne({board, _id}, 'delete_password');
                assert.isNotNull(thread);
                if (await checkPassword(delete_password, thread.delete_password)) {
                    await thread.delete();
                    return res.send(MSG.SUCCESS);
                }
                return res.send(MSG.INCORRECT);
            } catch {
                return res.send('error');
            }
        })
        .get(async function (req, res) {
            const {board} = req.params;
            const threads = await Thread.find({board}).sort({bumped_at: 1}).limit(10)

            return res.json(
                threads.map(t => ({
                    _id: t._id,
                    text: t.text,
                    created_on: t.created_on,
                    bumped_on: t.bumped_on,
                    replies: t.replies.sort((a, b) => a.created_on >= b.created_on ? -1 : 1).slice(0, 3)
                }))
            );

        });

    app.route('/api/replies/:board')
        .post(async function (req, res) {
            try {
                const {board} = req.params;
                const {text, delete_password} = req.body;
                const _id = ObjectId(req.body.thread_id);

                const t = await Thread.findOne({board, _id});

                assert.isNotNull(t);
                t.replies.push({text, delete_password: await hashPassword(delete_password)});
                await t.save();
                return res.redirect('/b/' + board + '/' + req.body.thread_id);
            } catch (e) {
                return res.send('error');
            }
        })
        .put(async function (req, res) {
            try {
                const {board} = req.params;
                const thread_id = ObjectId(req.body.thread_id);
                const reply_id = ObjectId(req.body.reply_id);

                assert.isNotNull(
                    await Thread.findOneAndUpdate({
                        board,
                        _id: thread_id,
                        'replies._id': reply_id
                    }, {
                        $set: {
                            'replies.$.reported': true
                        }
                    }).select({_id: 1})
                );
                return res.send(MSG.REPORT);
            } catch (e) {
                return res.send('error');
            }
        })
        .delete(async function (req, res) {
            try {
                const {board} = req.params;
                const {delete_password} = req.body;
                const thread_id = ObjectId(req.body.thread_id);
                const reply_id = ObjectId(req.body.reply_id);

                const q = {board, _id: thread_id, 'replies._id': reply_id}
                const thread = await Thread.findOne(q).select({'replies.delete_password': 1, 'replies._id': 1});
                assert.isNotNull(thread);
                const reply = thread.replies.id(reply_id);
                assert.isNotNull(reply);

                if (await checkPassword(delete_password, reply.delete_password)) {
                    const result = await Thread.findOneAndUpdate(q, {
                        $pull: {
                            'replies': {
                                _id: reply_id
                            }
                        }
                    }).select({_id: 1});
                    assert.isNotNull(result);
                    return res.send(MSG.SUCCESS);
                }
                return res.send(MSG.INCORRECT)

            } catch (e) {
                return res.send('error');
            }
        })
        .get(async function (req, res) {
            try {
                const {board} = req.params;
                const _id = ObjectId(req.query.thread_id);

                const t = await Thread.findOne({board, _id}).select({
                    __v: 0,
                    reported: 0,
                    delete_passwword: 0
                });
                assert.isNotNull(t);
                return res.json({
                    _id,
                    text: t.text,
                    created_on: t.created_on,
                    bumped_on: t.bumped_on,
                    replies: t.replies.map(r => ({
                        _id: r._id,
                        text: r.text,
                        created_on: r.created_on
                    }))
                })
            } catch {
                return res.send('Error');
            }
        });

};
