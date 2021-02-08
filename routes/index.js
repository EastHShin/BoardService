const express = require('express');
const { renderString } = require('nunjucks');
const passport = require('passport');
const router = express.Router();
const models = require('../models');
const bcrypt = require('bcrypt');
const { isLoggedIn } = require('./middlewares');

/* GET home page. */
router.get('/', async (req, res, next) => {
    res.render('home');
});
router.get('/board', isLoggedIn, async (req, res, next) => {
    try {
        console.log('현재 유저', req.user.user_id);
        const user = await models.user.findOne({ where: { user_id: req.user.user_id } });
        const posts = await models.post.findAll();
        res.render('main', { posts, user });
    } catch (err) {
        console.error(err);
        next(err);
    }
});

router.get('/signUp', async (req, res, next) => {
    res.render('signUp');
});

router.get('/edit/:id', async (req, res, next) => {
    try {
        const postId = req.params.id;

        const post = await models.post.findOne({
            where: { id: postId }
        });
        if(post.writer != req.user.user_id){
            return res.send('수정 권한이 없는 게시물입니다.');
        }
        res.render('edit', { post });
    } catch (err) {
        console.log('데이터 조회 실패');
    }
})

router.get('/logout', (req,res) => {
    req.logout();
    req.session.destroy((err) => {
        res.redirect('/');
    })
});
router.post('/board', async (req, res, next) => {
    try {
        const body = await req.body;
        const user = req.user.user_id;
        await models.post.create({
            title: body.inputTitle,
            writer: user,
        })
        console.log('데이터 추가 완료');
        res.redirect('/board');
    } catch (err) {
        console.log('데이터 추가 실패');
        next(err);
    }
});


router.post('/signUp', async (req, res, next) => {
    try {
        const body = await req.body;
        const exUser = await models.user.findOne({ where: { user_id: body.email } });
        if (!exUser) {
            const hash = await bcrypt.hash(body.password, 12);
            await models.user.create({
                user_id: body.email,
                password: hash
            })
            console.log('데이터 추가 완료');
            res.redirect('/');
        } else {
            return res.send('이미 등록된 회원입니다');
        }
    } catch (err) {
        console.log('데이터 추가 실패');
        next(err);
    }
})
router.put('/board/:id', async (req, res, next) => {
    try {
        const postId = req.params.id;
        const body = req.body;
        
        await models.post.update({
            title: body.editTitle,
        }, {
            where: { id: postId }
        });
        console.log('데이터 수정 완료');
        res.redirect('/board');
    } catch (err) {
        console.log('데이터 수정 실패');
    }
});

router.delete('/board/:id', async (req, res, next) => {
    try {
        const postId = req.params.id;
        const post = await models.post.findOne({
            where: { id: postId }
        });
        if(post.writer != req.user.user_id){
            return res.send('삭제 권한이 없는 게시물입니다.');
        }
        await models.post.destroy({
            where: { id: postId }
        })
        console.log(postId, '번 Id 데이터 삭제 성공');
        res.redirect('/board');
    } catch (err) {
        console.log('데이터 삭제 실패');
    }
})

module.exports = router;
