USE smart_placement_portal;

INSERT INTO tests (title, description, duration_minutes)
SELECT 'Placement Mock Test 1', 'Balanced assessment covering all placement subjects.', 30
WHERE NOT EXISTS (SELECT 1 FROM tests WHERE title = 'Placement Mock Test 1');
INSERT INTO tests (title, description, duration_minutes)
SELECT 'Placement Mock Test 2', 'Technical and aptitude assessment for revision.', 30
WHERE NOT EXISTS (SELECT 1 FROM tests WHERE title = 'Placement Mock Test 2');
INSERT INTO tests (title, description, duration_minutes)
SELECT 'Placement Mock Test 3', 'Final readiness assessment across all subjects.', 35
WHERE NOT EXISTS (SELECT 1 FROM tests WHERE title = 'Placement Mock Test 3');

/* Rebuild each test with 3 questions from each of the 7 subjects = 21 questions. */
DELETE tq FROM test_questions tq JOIN tests t ON t.id = tq.test_id
WHERE t.title IN ('Placement Mock Test 1','Placement Mock Test 2','Placement Mock Test 3');

INSERT INTO test_questions (test_id, question_id)
SELECT t.id, q.id FROM tests t JOIN questions q
WHERE t.title = 'Placement Mock Test 1' AND q.id IN (
  SELECT id FROM (SELECT id FROM questions WHERE topic_id=1 ORDER BY RAND() LIMIT 3) a UNION ALL
  SELECT id FROM (SELECT id FROM questions WHERE topic_id=2 ORDER BY RAND() LIMIT 3) b UNION ALL
  SELECT id FROM (SELECT id FROM questions WHERE topic_id=3 ORDER BY RAND() LIMIT 3) c UNION ALL
  SELECT id FROM (SELECT id FROM questions WHERE topic_id=4 ORDER BY RAND() LIMIT 3) d UNION ALL
  SELECT id FROM (SELECT id FROM questions WHERE topic_id=5 ORDER BY RAND() LIMIT 3) e UNION ALL
  SELECT id FROM (SELECT id FROM questions WHERE topic_id=6 ORDER BY RAND() LIMIT 3) f UNION ALL
  SELECT id FROM (SELECT id FROM questions WHERE topic_id=7 ORDER BY RAND() LIMIT 3) g
);

INSERT INTO test_questions (test_id, question_id)
SELECT t.id, q.id FROM tests t JOIN questions q
WHERE t.title = 'Placement Mock Test 2' AND q.id IN (
  SELECT id FROM (SELECT id FROM questions WHERE topic_id=1 ORDER BY RAND() LIMIT 3) a UNION ALL
  SELECT id FROM (SELECT id FROM questions WHERE topic_id=2 ORDER BY RAND() LIMIT 3) b UNION ALL
  SELECT id FROM (SELECT id FROM questions WHERE topic_id=3 ORDER BY RAND() LIMIT 3) c UNION ALL
  SELECT id FROM (SELECT id FROM questions WHERE topic_id=4 ORDER BY RAND() LIMIT 3) d UNION ALL
  SELECT id FROM (SELECT id FROM questions WHERE topic_id=5 ORDER BY RAND() LIMIT 3) e UNION ALL
  SELECT id FROM (SELECT id FROM questions WHERE topic_id=6 ORDER BY RAND() LIMIT 3) f UNION ALL
  SELECT id FROM (SELECT id FROM questions WHERE topic_id=7 ORDER BY RAND() LIMIT 3) g
);

INSERT INTO test_questions (test_id, question_id)
SELECT t.id, q.id FROM tests t JOIN questions q
WHERE t.title = 'Placement Mock Test 3' AND q.id IN (
  SELECT id FROM (SELECT id FROM questions WHERE topic_id=1 ORDER BY RAND() LIMIT 3) a UNION ALL
  SELECT id FROM (SELECT id FROM questions WHERE topic_id=2 ORDER BY RAND() LIMIT 3) b UNION ALL
  SELECT id FROM (SELECT id FROM questions WHERE topic_id=3 ORDER BY RAND() LIMIT 3) c UNION ALL
  SELECT id FROM (SELECT id FROM questions WHERE topic_id=4 ORDER BY RAND() LIMIT 3) d UNION ALL
  SELECT id FROM (SELECT id FROM questions WHERE topic_id=5 ORDER BY RAND() LIMIT 3) e UNION ALL
  SELECT id FROM (SELECT id FROM questions WHERE topic_id=6 ORDER BY RAND() LIMIT 3) f UNION ALL
  SELECT id FROM (SELECT id FROM questions WHERE topic_id=7 ORDER BY RAND() LIMIT 3) g
);

SELECT t.title, COUNT(tq.question_id) AS total_questions
FROM tests t LEFT JOIN test_questions tq ON tq.test_id=t.id
WHERE t.title LIKE 'Placement Mock Test %'
GROUP BY t.id, t.title ORDER BY t.id;
