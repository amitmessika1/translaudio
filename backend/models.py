from sqlalchemy import Column, String, Text, Integer, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from db import Base

EMBEDDING_DIM = 1536


class Session(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    source_language = Column(String, nullable=True)
    target_language = Column(String, nullable=True)
    transcription = Column(Text, nullable=True)
    translation = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    chunks = relationship(
        "TranscriptChunk",
        back_populates="session",
        cascade="all, delete-orphan"
    )


class TranscriptChunk(Base):
    __tablename__ = "transcript_chunks"

    id = Column(String, primary_key=True, index=True)
    session_id = Column(
        String,
        ForeignKey("sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    chunk_index = Column(Integer, nullable=False)
    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=False)
    original_text = Column(Text, nullable=False)
    display_text = Column(Text, nullable=False)
    embedding = Column(Vector(EMBEDDING_DIM), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("Session", back_populates="chunks")