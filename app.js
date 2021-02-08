const express = require('express');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');
const bcrypt = require('bcrypt');
const indexRouter = require('./routes/index');
const session = require('express-session');
const nunjucks = require('nunjucks');
const dotenv = require('dotenv');
const models = require('./models/index');
const methodOverride = require('method-override');
dotenv.config();

const app = express();
models.sequelize.sync().then(() => {
    console.log('DB연결 성공');
}).catch(err => {
    console.log('연결 실패');
});

app.set('port', process.env.PORT || 3001);
app.set('view engine', 'html');
nunjucks.configure('views', {
    express: app,
    watch: true,
});

app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: false}));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(methodOverride('_method'));
app.use(session({
    resave: false,
    saveUninitialized: false,
    secret: process.env.COOKIE_SECRET,
    cookie: {
        httpOnly: true,
        secure: false,
    }
}));
const passport = require('passport')
    , LocalStrategy = require('passport-local').Strategy
    , KakaoStrategy = require('passport-kakao').Strategy;
passport.serializeUser((user,done) => {
    console.log('serializeUser', user);
    return done(null, user.user_id);
});
passport.deserializeUser(async(id, done) => {
    try{
        console.log('deserialize', id);
        const user = await models.user.findOne({
            where: {user_id: id}
        });
        return done(null, user);
    }catch(error){
        console.log('에러');
        return done(error);
    }
});

app.use(passport.initialize());
app.use(passport.session());

app.use('/', indexRouter);
passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
    },
    async(username, password, done) => {
        try{
            const exUser = await models.user.findOne({where: {user_id: username}});
            
            if(exUser){
                const result = await bcrypt.compare(password, exUser.password);
                if(result){
                    return done(null, exUser);
                }
                else{
                    return done(null, false, {message: '비밀번호가 일치하지 않습니다.'});
                }
            }
            else{
                return done(null, false, {message: '가입되지 않은 회원입니다.'});
            }
        }catch(error){
            console.error(error);
            done(error);
        }
    }
    ));          
passport.use(new KakaoStrategy({
    clientID: process.env.KAKAO_ID,
    callbackURL: '/auth/login/kakao/callback',
}, async(accessToken, refreshToken, profile, done) => {
    console.log('kakao profile', profile);
    try{
        const exUser = await models.user.findOne({
            where: { user_id: profile.username },
        });
        
        if(exUser){
            return done(null, exUser);
        }else{
            console.log('여긴가??2');
            const newUser = await models.user.create({
                user_id: profile.username,
                password: '1234',
            });
            return done(null, newUser);
        }
    }catch(error){
        console.log('kakao login error!');
        return done(error);
    }
} ))
app.post('/auth/login',
    passport.authenticate('local', {
        successRedirect: '/board',
        failureRedirect: '/'
    }));

app.get('/auth/login/kakao', passport.authenticate('kakao'));
app.get('/auth/login/kakao/callback', passport.authenticate('kakao', {
    failureRedirect: '/',
}), (req, res) => {
    res.redirect('/board');
})
app.use((req,res,next) => {
    const error = new Error(`${req.method} ${req.url} 라우터가 없습니다.`);
    error.status = 404;
    next(error);
});

app.use((err, req, res, next) => {
    res.locals.message = err.message;
    res.locals.error = process.env.NODE_ENV !== 'production' ? err : {};
    res.status(err.status || 500);
    res.render('error');
  });
  
app.listen(app.get('port'), () => {
    console.log(app.get('port'), '번 포트에서 대기중');
});
  