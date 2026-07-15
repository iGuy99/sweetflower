-- Custom tema po galeriji (NULL = default "Zlatna klasika")
ALTER TABLE galleries ADD COLUMN theme JSON DEFAULT NULL;
