const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');
const MSG = require('../constants');
const Thread = require('../model');
const {hashPassword, checkPassword} = require('../crypto');

chai.use(chaiHttp);

const THREADS = '/api/threads/';
const REPLIES = '/api/replies/';
const BOARD = 'Board';
const THREAD_TEXT = 'THREAD TEXT!!';
const THREAD_DELETE_PASSWORD = 'Goodbye!';
const REPLY1_TEXT = 'reply 1'
const REPLY2_TEXT = 'reply 2' // Use "text + mod" as password for ease

suite('Functional Tests', function () {
    let newThread;

    beforeEach(async () => {
        await Thread.deleteMany();
        newThread = await Thread.create({
            board: BOARD,
            text: THREAD_TEXT,
            delete_password: await hashPassword(THREAD_DELETE_PASSWORD),
            replies: [
                {text: REPLY1_TEXT, delete_password: await hashPassword(`${REPLY1_TEXT}mod`)},
                {text: REPLY2_TEXT, delete_password: await hashPassword(`${REPLY2_TEXT}mod`)}
            ]
        });
        assert.isNotNull(newThread);
    })

    test('Creating a new thread: POST request to /api/threads/{board}', async function () {
        const diffThreadText = 'MF Doom';
        const diffPW = 'You a head?'
        const response = await chai.request(server).post(THREADS + BOARD).type('json').send({
            text: diffThreadText, delete_password: diffPW
        });
        assert.equal(response.status, 200);
        const created = await Thread.findOne({
            text: diffThreadText, board: BOARD
        });
        assert.isNotNull(created);
        assert.isTrue(await checkPassword(diffPW, created.delete_password));
    });
    test('Viewing the 10 most recent threads with 3 replies each: GET request to /api/threads/{board}', async function () {
        const response = await chai.request(server).get(THREADS + BOARD);
        assert.equal(response.status, 200);
        assert.isArray(response.body);
    });
    test('Deleting a thread with the incorrect password: DELETE request to /api/threads/{board} with an invalid delete_password', async function () {
        const response = await chai.request(server).delete(THREADS + BOARD).send({
            thread_id: newThread._id,
            delete_password: THREAD_DELETE_PASSWORD + 'mod'
        });
        assert.equal(response.status, 200);
        assert.equal(response.text, MSG.INCORRECT);
        assert.isNotNull(await Thread.findById(newThread._id));
        await newThread.delete();
    });
    test('Deleting a thread with the correct password: DELETE request to /api/threads/{board} with a valid delete_password', async function () {
        const response = await chai.request(server).delete(THREADS + BOARD).send({
            thread_id: newThread._id,
            delete_password: THREAD_DELETE_PASSWORD
        });
        assert.equal(response.status, 200);
        assert.equal(response.text, MSG.SUCCESS);
        assert.isNull(await Thread.findById(newThread._id));
    });
    test('Reporting a thread: PUT request to /api/threads/{board}', async function () {
        assert.isFalse(newThread.reported);
        const response = await chai.request(server).put(THREADS + BOARD).send({
            report_id: newThread._id,
        });
        assert.equal(response.status, 200);
        assert.equal(response.text, MSG.REPORT);
        newThread = await Thread.findById(newThread._id);
        assert.isTrue(newThread.reported);

    });
    test('Creating a new reply: POST request to /api/replies/{board}', async function () {
        const originalLength = newThread.replies.length;
        const reply3 = 'This new one';
        const response = await chai.request(server).post(REPLIES + BOARD).send({
            thread_id: newThread._id,
            text: reply3, delete_password: `${reply3}mod`
        });
        assert.equal(response.status, 200);
        newThread = await Thread.findById(newThread._id);
        assert.equal(newThread.replies.length, originalLength + 1);
        const newReply = newThread.replies[originalLength];
        assert.equal(newReply.text, reply3);
        assert.isTrue(await checkPassword(reply3 + 'mod', newReply.delete_password));
    });
    test('Viewing a single thread with all replies: GET request to /api/replies/{board}', async function () {
        const response = await chai.request(server).get(REPLIES + BOARD + '?thread_id=' + newThread._id);
        assert.equal(response.status, 200);
        assert.hasAnyKeys(response.body, ['replies']);
        assert.equal(response.body.replies.length, newThread.replies.length);
    });
    test('Deleting a reply with the incorrect password: DELETE request to /api/replies/{board} with an invalid delete_password', async function () {
        const reply = newThread.replies[0];
        const response = await chai.request(server).delete(REPLIES + BOARD).send({
            thread_id: newThread._id, reply_id: reply._id, delete_password: reply.text + 'not the correct salt'
        });
        assert.equal(response.status, 200);
        assert.equal(response.text, MSG.INCORRECT);
    });
    test('Deleting a reply with the correct password: DELETE request to /api/replies/{board} with a valid delete_password', async function () {
        const originalLength = newThread.replies.length;
        assert.isAtLeast(originalLength, 1);
        const reply = newThread.replies[0];
        const response = await chai.request(server).delete(REPLIES + BOARD).send({
            thread_id: newThread._id, reply_id: reply._id, delete_password: reply.text + 'mod'
        });
        assert.equal(response.status, 200);
        assert.equal(response.text, MSG.SUCCESS);
        assert.equal(
            (await Thread.findById(newThread._id)).replies.length,
            originalLength - 1
        );
    });
    test('Reporting a reply: PUT request to /api/replies/{board}', async function () {
        const reply = newThread.replies[0];
        assert.isFalse(reply.reported);
        const response = await chai.request(server).put(REPLIES + BOARD).send({
            thread_id: newThread._id, reply_id: reply._id,
        });
        assert.equal(response.status, 200);
        assert.equal(response.text, MSG.REPORT);
        newThread = await Thread.findById(newThread._id);
        assert.isTrue(newThread.replies[0].reported);
    });
});
