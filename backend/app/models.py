from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Text
from sqlalchemy.orm import relationship
from .database import Base


class Printer(Base):
    __tablename__ = "printers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    moonraker_url = Column(String(255), nullable=True)
    status = Column(String(50), nullable=False, default="offline")
    created_at = Column(DateTime, default=datetime.utcnow)
    jobs = relationship("Job", back_populates="printer")


class Filament(Base):
    __tablename__ = "filaments"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    color = Column(String(50), nullable=True)
    material = Column(String(50), nullable=True)
    price_per_kg = Column(Float, nullable=True)
    stock_grams = Column(Float, nullable=True)
    brand = Column(String(120), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Job(Base):
    __tablename__ = "jobs"
    id = Column(Integer, primary_key=True, index=True)
    printer_id = Column(Integer, ForeignKey("printers.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    material = Column(String(80), nullable=True)
    duration_estimated = Column(Float, nullable=True)
    duration_slicer = Column(Float, nullable=True)
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    status = Column(String(50), nullable=False, default="queued")
    printer = relationship("Printer", back_populates="jobs")


class Setting(Base):
    __tablename__ = "settings"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(120), unique=True, nullable=False)
    value = Column(Text, nullable=True)


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
