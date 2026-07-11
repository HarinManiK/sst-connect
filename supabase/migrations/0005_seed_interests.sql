insert into interests (name) values
  ('Competitive Programming'), ('Web Dev'), ('AI/ML'), ('Open Source'),
  ('Gaming'), ('Music'), ('Football'), ('Cricket'), ('Badminton'),
  ('Basketball'), ('Reading'), ('Photography'), ('Dance'), ('Anime'),
  ('Movies'), ('Travel'), ('Fitness/Gym'), ('Debate/MUN'), ('Entrepreneurship'),
  ('Art/Design')
on conflict (name) do nothing;
