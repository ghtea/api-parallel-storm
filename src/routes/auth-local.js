import express from 'express';
import Joi from 'joi';
import cookieParser from 'cookie-parser';
import User from '../models/User';
import { generateToken, jwtMiddleware } from '../works/auth/token';

var router = express.Router();

// 의존한 강의 https://backend-intro.vlpt.us/5/01.html

router.use(jwtMiddleware);


// https://devlog-h.tistory.com/13  koa vs express
router.post('/sign-up', async (req, res, next) => {
  
  try {
    
    
    /*
    // 꼭 필요하지는 않으니 생략
    // 검증의 방법/형태
    const schema = Joi.object().keys({
        _id: Joi.string().required().error( (errors) => {
          console.log("error in _id")
          return errors;
        }) // error
        //username: Joi.string().alphanum().min(4).max(15).required()
        , email: Joi.string().email().required().error( (errors) => {
          console.log("error in email")
          return errors;
        }) // error
        ,password: Joi.string().required().min(6).error( (errors) => {
          console.log("error in password")
          return errors;
        }) // error
    });

    const result = schema.validate(req.body); // 여기서 검증


    // 스키마 검증 실패
    if(result.error) {
      
      // 클라이언트에서 자세한 정보를 듣고 이용하기 위해 status 코드보다는 그냥 상황 정보를 보낸다... 내 실력을 고려한 결과...
      res.json({situation: "error", reason: "schema", message:"check your format of email or password"});
      
      console.log("validate catched something")
      return;
    }
    */

    // email 중복 체크
    let existingEmail = null;
    try {
      existingEmail = await User.findOne({email: req.body.email}).exec(); 
    } catch (error) {
      console.log(error);
      res.status(500).send() // 여기선 내가 잘 모르는 에러라 뭘 할수가...   나중에 알수없는 에러라고 표시하자...
    }

    if(existingEmail) {
    // 중복되는 이메일이 있을 경우
      console.log("duplicate email") 
      //res.status(409).json({reason: "duplicate", which: "email"});
      
      // 클라이언트에서 자세한 정보를 듣고 이용하기 위해 status 코드보다는 그냥 상황 정보를 보낸다... 내 실력을 고려한 결과...
      res.json({situation: "error", reason: "duplicate", which: "email", message:"duplicate email"});
      return; 
      
      // https://backend-intro.vlpt.us/3/04.html
      // https://velog.io/@kim-macbook/Cannot-set-headers-after-they-are-sent-to-the-client
    }


    // battletag 중복 체크
    let existingBattletag = null;
    try {
      existingBattletag = await User.findOne({battletagConfirmed: req.body.battletagPending}).exec(); 
    } catch (error) {
      console.log(error);
      res.status(500).send() // 여기선 내가 잘 모르는 에러라 뭘 할수가...   나중에 알수없는 에러라고 표시하자...
    }

    if(existingBattletag) {
      console.log("duplicate battletag") 
      
      res.json({situation: "error", reason: "duplicate", which: "battletag", message:"duplicate battletag"});
      return; 
    }
    
    
    
    // 계정 생성
    let mongoUser = null;
    try {
      mongoUser = await User.register(req.body);   
    } catch (error) {
      console.log(error);
      res.status(500).send() // 여기선 내가 잘 모르는 에러라 뭘 할수가...   나중에 알수없는 에러라고 표시하자...
      return;
    }


    let token = null;
    try {
      token = await mongoUser.generateToken(); 
    } catch (error) {
      console.log(error);
      res.status(500).send(error);  // 여기선 내가 잘 모르는 에러라 뭘 할수가...   나중에 알수없는 에러라고 표시하자...
      return;
    }
    
    
    // 여기까지 에러가 없었으면 성공적으로 아래와 같이 실행!
    
    // 회원가입과 동시에 로그인 
    // 하지만 이후 프론트엔드에서 바로 blizzard battletag 인증 시작
    // battletagPending 은 항상 조금만 유지시키고 얼마후 초기화하는 작업이 필요하다
    
    res.cookie('access_token', token, { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 * 7}); // cookie 에 토큰 보내주기  // 참고로 아마 브라우져에서 확인할 수 없으니 노력 no
    res.json(
      {
        _id: mongoUser._id
        , email: mongoUser.email
      }
    ); // 유저 정보로 응답합니다.
    //console.log(res)

  } catch(error) { next(error) }
  
});






router.post('/log-in', async (req, res, next) => {
  
  try {
    
    const { email, password } = req.body; 
    
    
    let foundUser = null;
    try {
      // 이메일로 계정 찾기
      foundUser = await User.findOne({ email: email }).exec();
    } catch (error) {
      console.log(error);
      res.status(500).send(error); // 여기선 내가 잘 모르는 에러라 뭘 할수가...   나중에 알수없는 에러라고 표시하자...
      return;
    }
    
    if(!foundUser) {
    // 해당 유저가 존재하지 않으면
      res.json({situation: "error", reason: "none", which: "email", message:"no user with this email"});
      //res.status(403).send("no user by this email or wrong password")
      return;
    }
    
    else if(!foundUser.validatePassword(password)) {
    // 비밀번호가 일치하지 않으면
      res.json({situation: "error", reason: "wrong", which: "password", message:"password is wrong"});
      //res.status(403).send("no user by this email or wrong password")
        
      return;
    }


    let token = null;
    try {
      token = await foundUser.generateToken();
      
      console.log("following is generated token")
      console.log(token);
    } catch (error) {
      console.log(error);
      res.status(500).send(error);  // 여기선 내가 잘 모르는 에러라 뭘 할수가...   나중에 알수없는 에러라고 표시하자...
      return;
    }
    
  
    res.cookie('access_token', token, { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 * 7 }); 
    // cookie 브라우저가 설정하려면 별도의 추가 설정 필요
    // https://www.zerocho.com/category/NodeJS/post/5e9bf5b18dcb9c001f36b275
    res.json(
      {
        _id: foundUser._id
        , email: foundUser.email
        , battletagConfirmed: foundUser.battletagConfirmed
      }
    ); // 유저 정보로 응답합니다.
    //console.log(res)

    
  } catch(error) { next(error) }
  
});


/*

// 3번째 API exists 에서는 :key(email|username) 이 사용되었는데, 이 의미는 key 라는 파라미터를 설정하는데, 이 값들이 email 이나 username 일때만 허용한다는 것 입니다.
router.post('/exists/:key(email|username)/:value', async (req, res, next) => {
  
  try {
    
    const { key, value } = req.params;
    let tUser = null;

    try {
      
      // key 에 따라 findByEmail 혹은 findByUsername 을 실행합니다.
      tUser = await (key === 'email' ? User.findByEmail(value) : User.findByUsername(value)); 
      
    } catch (error) {
      res.status(500).send(error);
    }

    res.json ( {
        exists: tUser !== null
    });
    
    
  } catch(error) { next(error) }
  
});
*/



router.post('/log-out', async (req, res, next) => {
  
  try {
    
    res.cookie('access_token', null, {
        maxAge: 0, 
        httpOnly: true
    });
    
    res.status(204).send("log out")
    
  } catch(error) { next(error) }
  
});


// 
router.get('/check', async (req, res, next) => {
  
  // 여기서 jwt 미들웨어가 중간에 일해주고, req에 tokenUser 을 끼워준다
  // tokenUser 란 token 으로 부터 알게된 유저 정보
  
  try {
    
    //console.log("hello, I'm /check")
    //console.log(req);
    
    const { tokenUser } = req;
    
    
    if(!tokenUser) {
      console.log("there is no tUser")
      res.status(403); // forbidden
      return;
    }
    
    
    let foundUser = null;
    try {
      // 이메일로 계정 찾기
      foundUser = await User.findOne({ email: tokenUser.email }).exec();
    } catch (error) {
      console.log(error);
      res.status(500).send(error); // 여기선 내가 잘 모르는 에러라 뭘 할수가...   나중에 알수없는 에러라고 표시하자...
      return;
    }
    
    if(!foundUser) {
    // 해당 유저가 존재하지 않으면
      res.json({situation: "error", reason: "none", which: "email", message:"no user with this token"});
      return;
    }
    
    
    res.json(
      {
        _id: foundUser._id
        , email: foundUser.email
        , battletagConfirmed: foundUser.battletagConfirmed
      }
    ); // 유저 정보로 응답합니다.
    
  } catch(error) { next(error) }
  
});


module.exports = router;









