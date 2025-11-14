ALTER TABLE player_credits ADD CONSTRAINT unique_player_per_key UNIQUE (api_key_id, external_player_id);
