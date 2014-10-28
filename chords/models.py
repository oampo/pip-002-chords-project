import os.path

from flask import url_for
from sqlalchemy import Column, Integer, String, Sequence, ForeignKey
from sqlalchemy.orm import relationship

from chords import app
from database import Base, engine

class Song(Base):
    __tablename__ = "songs"

    id = Column(Integer, Sequence("song_id_sequence"), primary_key=True)
    file = relationship("File", uselist=False, backref="song")

    def asDictionary(self):
        return {"id": self.id, "file": self.file.asDictionary()}

class File(Base):
    __tablename__ = "files"

    id = Column(Integer, Sequence("post_id_sequence"), primary_key=True)
    filename = Column(String(1024))
    song_id = Column(Integer, ForeignKey("songs.id"))

    def asDictionary(self):
        return {
            "id": self.id,
            "name": self.filename,
            "path": url_for("uploaded_file", filename=self.filename)
        }

Base.metadata.create_all(engine)
