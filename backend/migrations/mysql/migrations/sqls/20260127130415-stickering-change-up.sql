ALTER TABLE stickering
  ADD COLUMN sticker_type_1 INT NULL AFTER repack_supervisor_id,
  ADD COLUMN sticker_type_2 INT NULL AFTER sticker_type_1,
  ADD CONSTRAINT fk_stickering_sticker_type_1
    FOREIGN KEY (sticker_type_1) REFERENCES materials(material_id),
  ADD CONSTRAINT fk_stickering_sticker_type_2
    FOREIGN KEY (sticker_type_2) REFERENCES materials(material_id);