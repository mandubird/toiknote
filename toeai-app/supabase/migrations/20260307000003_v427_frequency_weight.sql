-- v4.27: tag_master에 frequency_weight 추가 (비출 문법 우선순위 #1)
-- 토익 실제 출제 빈도를 반영한 가중치. weakness_score 계산에 곱해짐.

ALTER TABLE tag_master
  ADD COLUMN IF NOT EXISTS frequency_weight NUMERIC DEFAULT 1.0;

COMMENT ON COLUMN tag_master.frequency_weight IS
  '토익 출제 빈도 가중치. 높을수록 자주 출제. weakness_score에 곱해져 우선순위에 반영됨.';

-- 기초 문법 (P5 depth=1): 고빈도 출제 → 1.8
UPDATE tag_master
  SET frequency_weight = 1.8
  WHERE part = 'P5' AND depth = 1;

-- 중급 문법 (P5 depth=2): 중빈도 → 1.4
UPDATE tag_master
  SET frequency_weight = 1.4
  WHERE part = 'P5' AND depth = 2;

-- 고급 문법 (P5 depth=3+): 저빈도 → 1.0 (기본값 유지)

-- Part 7: 시간/정답률 영향 큼 → 1.3
UPDATE tag_master
  SET frequency_weight = 1.3
  WHERE part = 'P7';

-- Part 6: 중간 → 1.1
UPDATE tag_master
  SET frequency_weight = 1.1
  WHERE part = 'P6';

-- LC (Part 2 우회답변 등): 고빈도 함정 → 1.5
UPDATE tag_master
  SET frequency_weight = 1.5
  WHERE part = 'LC' AND category = 'LC';
