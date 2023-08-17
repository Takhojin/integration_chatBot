## 구현한 기능 

 open AI 를 통한 챗봇 구현

## 기능을 구현하기 위해 사용한 스택

 1. fastify : 프레임워크 중에서도 빠르다. express에 비해서 구조가 더 간단하다 , 플러그인 시스템을 사용하여 확장하기 편하다
 2. fastify-cli
 3. postgresSQL-vector : vector를 지원하는 데이터베이스 툴
 4. prisma : orm 기능을 이용하기 위해 사용 , 유지 보수 용이성 ( 스키마관리를 통해서 )
 5. Redis : lamda의 30초 제한을 피하기 위해 redis기능으로 ticket 시스템을 구현하여 대기시간이 30초가 넘어가지않도록 구현

## 기능을 구현하기 위한 flow와 그 안에서의 로직

### 1. 들어온 input data tag화
- tag 값을 최대한 정확하게 반환하도록 AI에게 요청문 자세히 기술
- 예시 tag는 tag값이 true인 경우에만 반환
- tag를 여러개를 반환할수도 있으므로 배열로 작성

### 2. tag화 한 결과를 이용하여 쿼리 조건문 작성

### 3. 들어온 input data 임배딩

### 4. 임배딩한 결과와 db에 저장된 임배딩값으로 코사인 유사도 측정
- prisma 특성 상 vector 값은 지원하지 않으므로 string 형식으로 변환

### 5. 측정한 결과중 가장 유사한 데이터 갯수 지정하여 return
- 갯수를 지정하여 top4 데이터 return
- db확장성과 유지,보수를 고려하여 SELECT 문을 작성하기 전에 DB에 저장되있는 열의 이름들을 출력
- vector의 값은 return할 필요가 없기 때문에 열의 이름들 중 vector가 포함된 열은 SELECT문의 사용하지 않음
- 데이터의 토큰수가 16K가 넘지않도록 설정

### 6. return한 결과물을 다시 openAPI를 이용하여 답변을 작성
- 사용자의 input, DB에서 얻은 content를 참고하여 답변을 작성하도록 유도
- 데이터의 토큰수 + input의 토큰수가 4k를 넘어갈 경우 모델을 업그레이드해서 답변하도록 설정

### 7. 답변결과 return
- AI의 답변은 객체로 저장
- AI의 답변과 코사인 유사도를 측정하여 나온 결과물을 배열의 형태로 return
- 만약 tag 결과가 원하는 형식이 아니거나, 없는 tag를 준다면 if문을 통해 where절 삽입하지 않도록 설정

### 8. redis 기능
- redis 기능중 ticket을 활용하여 기능을 구현
- .post 라우트 에서는 redis 에서 활용하도록 key 값을 생성 ( uuid를 통해 / 중복된 키가 없게 하기위해서 )
- get 라우트에서는 redis에서 key값을 활용하여 데이터를 받도록 구성
- 라우터를 나눠서 post / get post에서는 답변을 얻는 전처리 단계를 , get 은 답변을 도출하는 식으로구성
- lamda getaway=30 이기 때문에 나눠서 작성 
- 성공적으로 답변과 결과물이 출력되면 redis 에 해당 key는 파기

## 결과물

- post를 활용하여 key를 발급 
<img width="1280" alt="스크린샷 2023-06-27 오후 7 20 41" src="https://github.com/medistream-team/vector-connector/assets/125236449/b1358f9d-f53d-4402-8841-ef6ca760627d">

- get 을 활용하여 path로 키를 주면 ai가 답변을 도출
<img width="1280" alt="스크린샷 2023-06-27 오후 7 22 35" src="https://github.com/medistream-team/vector-connector/assets/125236449/5a0e3cec-be48-4f95-b322-3b553616fbb6">



