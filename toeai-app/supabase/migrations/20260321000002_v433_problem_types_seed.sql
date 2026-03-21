-- v433: problem_types + tag_dictionary seed (명세 26.03.21 §7 + LC 최소)

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (5, '문법', '시제');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('시간 부사절 시제 혼동'), ('현재완료 vs 단순과거 구분 어려움'), ('미래시제 표현 혼동'), ('완료진행형 이해 부족'), ('시제 일치 오류')) AS v(tag)
WHERE pt.part = 5 AND pt.category_level1 = '문법' AND pt.category_level2 = '시제';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (5, '문법', '수일치');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('주어 핵심 명사 찾기 실패'), ('수식어구 때문에 주어 놓침'), ('복합 주어 수 판단 오류'), ('부정대명사(each, every) 수 혼동'), ('집합명사 수 혼동')) AS v(tag)
WHERE pt.part = 5 AND pt.category_level1 = '문법' AND pt.category_level2 = '수일치';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (5, '문법', '태');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('능동/수동 문맥 판단 어려움'), ('자동사 vs 타동사 구분 못함'), ('be p.p vs have p.p 혼동'), ('문맥상 행위자 파악 못함')) AS v(tag)
WHERE pt.part = 5 AND pt.category_level1 = '문법' AND pt.category_level2 = '태';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (5, '문법', '가정법');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('가정법 과거 vs 과거완료 혼동'), ('wish/if절 시제 파악 어려움'), ('as if 가정법 오해'), ('혼합가정법 이해 부족')) AS v(tag)
WHERE pt.part = 5 AND pt.category_level1 = '문법' AND pt.category_level2 = '가정법';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (5, '문법', 'to부정사');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('to부정사 vs 동명사 선택 혼동'), ('목적/결과/원인 의미 구분 어려움'), ('원형부정사(사역/지각동사) 구분 못함'), ('to부정사 관용표현 암기 부족')) AS v(tag)
WHERE pt.part = 5 AND pt.category_level1 = '문법' AND pt.category_level2 = 'to부정사';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (5, '문법', '동명사');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('동명사 vs to부정사 선택 오류'), ('전치사 뒤 동명사 위치 혼동'), ('동명사 의미상 주어 파악 어려움'), ('동명사 관용표현 암기 부족')) AS v(tag)
WHERE pt.part = 5 AND pt.category_level1 = '문법' AND pt.category_level2 = '동명사';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (5, '문법', '분사');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('현재분사 vs 과거분사 구분 어려움'), ('분사구문 의미 파악 어려움'), ('감정유발(boring) vs 감정표현(bored) 혼동'), ('수식 대상 파악 어려움'), ('독립분사구문 이해 부족')) AS v(tag)
WHERE pt.part = 5 AND pt.category_level1 = '문법' AND pt.category_level2 = '분사';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (5, '문법', '접속사');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('등위/종속 접속사 구분 어려움'), ('시간/조건/양보 의미 혼동'), ('접속사 vs 전치사 구분 못함'), ('상관접속사(both A and B) 구조 오류')) AS v(tag)
WHERE pt.part = 5 AND pt.category_level1 = '문법' AND pt.category_level2 = '접속사';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (5, '문법', '전치사');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('전치사 의미 혼동 (in/on/at/by/for)'), ('숙어형 전치사 암기 부족'), ('전치사 vs 접속사 구분 못함'), ('문맥상 전치사 판단 어려움')) AS v(tag)
WHERE pt.part = 5 AND pt.category_level1 = '문법' AND pt.category_level2 = '전치사';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (5, '문법', '관계사');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('관계대명사 vs 관계부사 혼동'), ('선행사 파악 어려움'), ('제한적 vs 계속적 용법 구분 어려움'), ('that vs which vs who 선택 오류'), ('관계사 생략 가능 여부 판단 어려움')) AS v(tag)
WHERE pt.part = 5 AND pt.category_level1 = '문법' AND pt.category_level2 = '관계사';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (5, '문법', '비교급');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('원급/비교급/최상급 구분 어려움'), ('비교 대상 일치 오류'), ('배수 표현(twice as ~ as) 이해 부족'), ('비교급 관용표현 암기 부족')) AS v(tag)
WHERE pt.part = 5 AND pt.category_level1 = '문법' AND pt.category_level2 = '비교급';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (5, '문법', '도치');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('도치 구조 자체 인식 못함'), ('부정어 도치 규칙 모름 (Never, Not only)'), ('장소 부사구 도치 혼동'), ('도치 후 주어/동사 수일치 오류')) AS v(tag)
WHERE pt.part = 5 AND pt.category_level1 = '문법' AND pt.category_level2 = '도치';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (5, '문법', '병치 구조');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('and/or 앞뒤 형태 불일치'), ('상관접속사 병치 구조 오류'), ('비교 병치 구조 파악 어려움')) AS v(tag)
WHERE pt.part = 5 AND pt.category_level1 = '문법' AND pt.category_level2 = '병치 구조';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (5, '문법', '문장 구조');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('주어/동사 파악 어려움'), ('수식어구와 핵심어 구분 어려움'), ('절과 구 구분 어려움'), ('복잡한 중문/복문 해석 어려움')) AS v(tag)
WHERE pt.part = 5 AND pt.category_level1 = '문법' AND pt.category_level2 = '문장 구조';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (5, '어휘', '동사 어휘');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('유사 의미 동사 혼동'), ('collocation(동사+명사 결합) 부족'), ('자동사/타동사 용법 혼동'), ('문맥상 동사 의미 파악 어려움'), ('동사 파생어/어근 모름')) AS v(tag)
WHERE pt.part = 5 AND pt.category_level1 = '어휘' AND pt.category_level2 = '동사 어휘';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (5, '어휘', '명사 어휘');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('비즈니스 명사 어휘 부족'), ('유사 의미 명사 혼동'), ('추상 명사 의미 파악 어려움'), ('복합 명사(compound noun) 의미 혼동')) AS v(tag)
WHERE pt.part = 5 AND pt.category_level1 = '어휘' AND pt.category_level2 = '명사 어휘';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (5, '어휘', '형용사 어휘');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('유사 의미 형용사 혼동'), ('명사 수식 vs 서술 용법 혼동'), ('감정 형용사 어휘 부족'), ('형용사 파생어 형태 혼동')) AS v(tag)
WHERE pt.part = 5 AND pt.category_level1 = '어휘' AND pt.category_level2 = '형용사 어휘';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (5, '어휘', '부사 어휘');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('빈도부사 위치/의미 혼동'), ('양태 부사 의미 혼동'), ('접속 부사 의미 혼동 (however, therefore, nevertheless)'), ('형용사 vs 부사 형태 구분 오류')) AS v(tag)
WHERE pt.part = 5 AND pt.category_level1 = '어휘' AND pt.category_level2 = '부사 어휘';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (5, '어휘', '유사의미 어휘');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('뉘앙스 차이 파악 어려움'), ('문맥에 맞는 단어 선택 어려움'), ('파생어 형태 혼동 (affect/effect 등)')) AS v(tag)
WHERE pt.part = 5 AND pt.category_level1 = '어휘' AND pt.category_level2 = '유사의미 어휘';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (5, '어휘', '숙어 표현');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('숙어 자체를 모름'), ('문맥에서 의미 유추 어려움'), ('전치사 결합 숙어 오류 (result in vs result from)')) AS v(tag)
WHERE pt.part = 5 AND pt.category_level1 = '어휘' AND pt.category_level2 = '숙어 표현';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (6, '문법', '시제');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('시간 부사절 시제 혼동'), ('현재완료 vs 단순과거 구분 어려움'), ('미래시제 표현 혼동'), ('완료진행형 이해 부족'), ('시제 일치 오류')) AS v(tag)
WHERE pt.part = 6 AND pt.category_level1 = '문법' AND pt.category_level2 = '시제';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (6, '문법', '수일치');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('주어 핵심 명사 찾기 실패'), ('수식어구 때문에 주어 놓침'), ('복합 주어 수 판단 오류'), ('부정대명사(each, every) 수 혼동'), ('집합명사 수 혼동')) AS v(tag)
WHERE pt.part = 6 AND pt.category_level1 = '문법' AND pt.category_level2 = '수일치';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (6, '문법', '태');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('능동/수동 문맥 판단 어려움'), ('자동사 vs 타동사 구분 못함'), ('be p.p vs have p.p 혼동'), ('문맥상 행위자 파악 못함')) AS v(tag)
WHERE pt.part = 6 AND pt.category_level1 = '문법' AND pt.category_level2 = '태';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (6, '문법', '가정법');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('가정법 과거 vs 과거완료 혼동'), ('wish/if절 시제 파악 어려움'), ('as if 가정법 오해'), ('혼합가정법 이해 부족')) AS v(tag)
WHERE pt.part = 6 AND pt.category_level1 = '문법' AND pt.category_level2 = '가정법';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (6, '문법', 'to부정사');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('to부정사 vs 동명사 선택 혼동'), ('목적/결과/원인 의미 구분 어려움'), ('원형부정사(사역/지각동사) 구분 못함'), ('to부정사 관용표현 암기 부족')) AS v(tag)
WHERE pt.part = 6 AND pt.category_level1 = '문법' AND pt.category_level2 = 'to부정사';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (6, '문법', '동명사');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('동명사 vs to부정사 선택 오류'), ('전치사 뒤 동명사 위치 혼동'), ('동명사 의미상 주어 파악 어려움'), ('동명사 관용표현 암기 부족')) AS v(tag)
WHERE pt.part = 6 AND pt.category_level1 = '문법' AND pt.category_level2 = '동명사';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (6, '문법', '분사');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('현재분사 vs 과거분사 구분 어려움'), ('분사구문 의미 파악 어려움'), ('감정유발(boring) vs 감정표현(bored) 혼동'), ('수식 대상 파악 어려움'), ('독립분사구문 이해 부족')) AS v(tag)
WHERE pt.part = 6 AND pt.category_level1 = '문법' AND pt.category_level2 = '분사';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (6, '문법', '접속사');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('등위/종속 접속사 구분 어려움'), ('시간/조건/양보 의미 혼동'), ('접속사 vs 전치사 구분 못함'), ('상관접속사(both A and B) 구조 오류')) AS v(tag)
WHERE pt.part = 6 AND pt.category_level1 = '문법' AND pt.category_level2 = '접속사';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (6, '문법', '전치사');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('전치사 의미 혼동 (in/on/at/by/for)'), ('숙어형 전치사 암기 부족'), ('전치사 vs 접속사 구분 못함'), ('문맥상 전치사 판단 어려움')) AS v(tag)
WHERE pt.part = 6 AND pt.category_level1 = '문법' AND pt.category_level2 = '전치사';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (6, '문법', '관계사');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('관계대명사 vs 관계부사 혼동'), ('선행사 파악 어려움'), ('제한적 vs 계속적 용법 구분 어려움'), ('that vs which vs who 선택 오류'), ('관계사 생략 가능 여부 판단 어려움')) AS v(tag)
WHERE pt.part = 6 AND pt.category_level1 = '문법' AND pt.category_level2 = '관계사';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (6, '문법', '비교급');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('원급/비교급/최상급 구분 어려움'), ('비교 대상 일치 오류'), ('배수 표현(twice as ~ as) 이해 부족'), ('비교급 관용표현 암기 부족')) AS v(tag)
WHERE pt.part = 6 AND pt.category_level1 = '문법' AND pt.category_level2 = '비교급';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (6, '문법', '도치');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('도치 구조 자체 인식 못함'), ('부정어 도치 규칙 모름 (Never, Not only)'), ('장소 부사구 도치 혼동'), ('도치 후 주어/동사 수일치 오류')) AS v(tag)
WHERE pt.part = 6 AND pt.category_level1 = '문법' AND pt.category_level2 = '도치';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (6, '문법', '병치 구조');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('and/or 앞뒤 형태 불일치'), ('상관접속사 병치 구조 오류'), ('비교 병치 구조 파악 어려움')) AS v(tag)
WHERE pt.part = 6 AND pt.category_level1 = '문법' AND pt.category_level2 = '병치 구조';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (6, '문법', '문장 구조');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('주어/동사 파악 어려움'), ('수식어구와 핵심어 구분 어려움'), ('절과 구 구분 어려움'), ('복잡한 중문/복문 해석 어려움')) AS v(tag)
WHERE pt.part = 6 AND pt.category_level1 = '문법' AND pt.category_level2 = '문장 구조';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (6, '어휘', '동사 어휘');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('유사 의미 동사 혼동'), ('collocation(동사+명사 결합) 부족'), ('자동사/타동사 용법 혼동'), ('문맥상 동사 의미 파악 어려움'), ('동사 파생어/어근 모름')) AS v(tag)
WHERE pt.part = 6 AND pt.category_level1 = '어휘' AND pt.category_level2 = '동사 어휘';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (6, '어휘', '명사 어휘');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('비즈니스 명사 어휘 부족'), ('유사 의미 명사 혼동'), ('추상 명사 의미 파악 어려움'), ('복합 명사(compound noun) 의미 혼동')) AS v(tag)
WHERE pt.part = 6 AND pt.category_level1 = '어휘' AND pt.category_level2 = '명사 어휘';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (6, '어휘', '형용사 어휘');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('유사 의미 형용사 혼동'), ('명사 수식 vs 서술 용법 혼동'), ('감정 형용사 어휘 부족'), ('형용사 파생어 형태 혼동')) AS v(tag)
WHERE pt.part = 6 AND pt.category_level1 = '어휘' AND pt.category_level2 = '형용사 어휘';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (6, '어휘', '부사 어휘');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('빈도부사 위치/의미 혼동'), ('양태 부사 의미 혼동'), ('접속 부사 의미 혼동 (however, therefore, nevertheless)'), ('형용사 vs 부사 형태 구분 오류')) AS v(tag)
WHERE pt.part = 6 AND pt.category_level1 = '어휘' AND pt.category_level2 = '부사 어휘';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (6, '어휘', '유사의미 어휘');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('뉘앙스 차이 파악 어려움'), ('문맥에 맞는 단어 선택 어려움'), ('파생어 형태 혼동 (affect/effect 등)')) AS v(tag)
WHERE pt.part = 6 AND pt.category_level1 = '어휘' AND pt.category_level2 = '유사의미 어휘';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (6, '어휘', '숙어 표현');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('숙어 자체를 모름'), ('문맥에서 의미 유추 어려움'), ('전치사 결합 숙어 오류 (result in vs result from)')) AS v(tag)
WHERE pt.part = 6 AND pt.category_level1 = '어휘' AND pt.category_level2 = '숙어 표현';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (7, '정보 찾기', '육하원칙');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('질문 키워드 파악 못함'), ('근거 문장 위치 찾기 어려움'), ('숫자/날짜/이름 정보 놓침'), ('paraphrasing된 답 연결 못함')) AS v(tag)
WHERE pt.part = 7 AND pt.category_level1 = '정보 찾기' AND pt.category_level2 = '육하원칙';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (7, '정보 찾기', '세부 정보 찾기');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('스캔 읽기 전략 부족'), ('비슷한 보기 구분 어려움'), ('지문 내 정보 위치 파악 어려움'), ('세부 사실과 추론 혼동')) AS v(tag)
WHERE pt.part = 7 AND pt.category_level1 = '정보 찾기' AND pt.category_level2 = '세부 정보 찾기';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (7, '추론', '의도 파악');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('화자의 의도 vs 표면 의미 혼동'), ('간접 표현 해석 어려움'), ('비즈니스 커뮤니케이션 맥락 이해 부족'), ('전체 대화 흐름 파악 어려움')) AS v(tag)
WHERE pt.part = 7 AND pt.category_level1 = '추론' AND pt.category_level2 = '의도 파악';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (7, '추론', '추론 문제');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('근거 문장 못 찾음'), ('paraphrasing된 보기 연결 어려움'), ('보기 해석 실수'), ('과도한 추론 (지문에 없는 내용 선택)'), ('시간 부족으로 추론 포기')) AS v(tag)
WHERE pt.part = 7 AND pt.category_level1 = '추론' AND pt.category_level2 = '추론 문제';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (7, '추론', 'NOT / TRUE');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('모든 보기 지문 대조 못함'), ('paraphrasing된 내용 대조 어려움'), ('함정 보기 (일부만 맞는 보기) 구분 어려움'), ('시간 부족으로 전체 확인 못함')) AS v(tag)
WHERE pt.part = 7 AND pt.category_level1 = '추론' AND pt.category_level2 = 'NOT / TRUE';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (7, '문장 구조 이해', '문장 위치');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('연결어(therefore, however, in addition) 의미 파악 어려움'), ('지시어(this, that, it, they) 추적 어려움'), ('문맥 흐름 파악 어려움'), ('앞뒤 문장 연결 논리 판단 어려움')) AS v(tag)
WHERE pt.part = 7 AND pt.category_level1 = '문장 구조 이해' AND pt.category_level2 = '문장 위치';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (7, '문장 구조 이해', '문장 삽입');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('논리적 흐름 파악 어려움'), ('문장 연결 근거 찾기 어려움'), ('전후 문맥 동시 파악 어려움')) AS v(tag)
WHERE pt.part = 7 AND pt.category_level1 = '문장 구조 이해' AND pt.category_level2 = '문장 삽입';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (7, '핵심 내용 이해', '주제 찾기');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('핵심 문장 vs 세부 내용 구분 어려움'), ('첫/끝 문장 전략 활용 부족'), ('보기 paraphrasing 연결 어려움'), ('요약 능력 부족')) AS v(tag)
WHERE pt.part = 7 AND pt.category_level1 = '핵심 내용 이해' AND pt.category_level2 = '주제 찾기';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (7, '핵심 내용 이해', '목적 찾기');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('글의 목적 vs 주제 혼동'), ('비즈니스 문서 유형 파악 어려움 (공지/요청/항의 등)'), ('목적 표현 직접 찾기 어려움')) AS v(tag)
WHERE pt.part = 7 AND pt.category_level1 = '핵심 내용 이해' AND pt.category_level2 = '목적 찾기';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (7, '어휘 추론', '동의어 찾기');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('문맥 의미 vs 사전 의미 혼동'), ('다의어 처리 어려움'), ('주변 문맥 활용 전략 부족')) AS v(tag)
WHERE pt.part = 7 AND pt.category_level1 = '어휘 추론' AND pt.category_level2 = '동의어 찾기';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (7, '어휘 추론', 'paraphrasing 이해');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('같은 의미 다른 표현 연결 어려움'), ('동의어 어휘 부족'), ('문장 구조 변형 이해 어려움')) AS v(tag)
WHERE pt.part = 7 AND pt.category_level1 = '어휘 추론' AND pt.category_level2 = 'paraphrasing 이해';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (1, '함정 유형', '동작함정');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('그림과 동작 불일치'), ('핵심 동사 놓침'), ('유사 동작 혼동')) AS v(tag)
WHERE pt.part = 1 AND pt.category_level1 = '함정 유형' AND pt.category_level2 = '동작함정';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (1, '함정 유형', '위치함정');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('위치 관계 오해'), ('전치사 표현 혼동'), ('도식 해석 실수')) AS v(tag)
WHERE pt.part = 1 AND pt.category_level1 = '함정 유형' AND pt.category_level2 = '위치함정';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (1, '함정 유형', '유사발음');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('비슷한 발음 혼동'), ('받침/탈락 구분 실패'), ('연음 놓침')) AS v(tag)
WHERE pt.part = 1 AND pt.category_level1 = '함정 유형' AND pt.category_level2 = '유사발음';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (1, '함정 유형', '수동태함정');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('수동태 문장 오해'), ('행위자 파악 실패'), ('시제와 결합 혼동')) AS v(tag)
WHERE pt.part = 1 AND pt.category_level1 = '함정 유형' AND pt.category_level2 = '수동태함정';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (1, '듣기 전략', '발음혼동');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('유사 음절 혼동'), ('강세 위치 오해'), ('약음 놓침')) AS v(tag)
WHERE pt.part = 1 AND pt.category_level1 = '듣기 전략' AND pt.category_level2 = '발음혼동';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (1, '듣기 전략', '집중력분산');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('첫 문장 놓침'), ('중간 산만함'), ('끝부분 집중 저하')) AS v(tag)
WHERE pt.part = 1 AND pt.category_level1 = '듣기 전략' AND pt.category_level2 = '집중력분산';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (1, '듣기 전략', '어휘몰라서');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('핵심 단어 미숙지'), ('숙어 표현 모름'), ('답 보기 어휘 어려움')) AS v(tag)
WHERE pt.part = 1 AND pt.category_level1 = '듣기 전략' AND pt.category_level2 = '어휘몰라서';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (2, '질문·답변', '의문문 패턴');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('의문사 놓침'), ('부정 의문 오해'), ('간접 의문 구조')) AS v(tag)
WHERE pt.part = 2 AND pt.category_level1 = '질문·답변' AND pt.category_level2 = '의문문 패턴';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (2, '질문·답변', '답변 유형');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('우회 답변 오해'), ('부분 부정 놓침'), ('동의/거절 뉘앙스')) AS v(tag)
WHERE pt.part = 2 AND pt.category_level1 = '질문·답변' AND pt.category_level2 = '답변 유형';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (2, '오답 원인', '속도');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('문장 따라가기 실패'), ('핵심만 못 골라냄'), ('되감기 습관 부족')) AS v(tag)
WHERE pt.part = 2 AND pt.category_level1 = '오답 원인' AND pt.category_level2 = '속도';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (3, '대화 이해', '의도·추론');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('화자 관계 파악 실패'), ('다음 행동 추론 어려움'), ('함축 의미 놓침')) AS v(tag)
WHERE pt.part = 3 AND pt.category_level1 = '대화 이해' AND pt.category_level2 = '의도·추론';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (3, '오답 원인', '집중·속도');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('세트 중간 이탈'), ('보기 읽는 시간 부족'), ('노이즈에 흔들림')) AS v(tag)
WHERE pt.part = 3 AND pt.category_level1 = '오답 원인' AND pt.category_level2 = '집중·속도';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (4, '담화 유형', '공지·회의');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('목적 문장 놓침'), ('숫자·일정 못 잡음'), ('화자 전환 혼동')) AS v(tag)
WHERE pt.part = 4 AND pt.category_level1 = '담화 유형' AND pt.category_level2 = '공지·회의';

INSERT INTO public.problem_types (part, category_level1, category_level2) VALUES (4, '오답 원인', '노트·어휘');
INSERT INTO public.tag_dictionary (problem_type_id, tag_name)
SELECT pt.id, v.tag FROM public.problem_types pt
CROSS JOIN (VALUES ('핵심만 메모 못함'), ('전문 어휘 부족'), ('다지선다 시간 부족')) AS v(tag)
WHERE pt.part = 4 AND pt.category_level1 = '오답 원인' AND pt.category_level2 = '노트·어휘';
