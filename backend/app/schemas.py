from datetime import datetime
from pydantic import BaseModel, EmailStr


class PrinterBase(BaseModel):
    name: str
    moonraker_url: str | None = None
    status: str | None = "offline"


class PrinterCreate(PrinterBase):
    pass


class PrinterUpdate(BaseModel):
    name: str | None = None
    moonraker_url: str | None = None
    status: str | None = None


class PrinterOut(PrinterBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class FilamentBase(BaseModel):
    name: str
    color: str | None = None
    material: str | None = None
    price_per_kg: float | None = None
    stock_grams: float | None = None
    brand: str | None = None


class FilamentCreate(FilamentBase):
    pass


class FilamentUpdate(BaseModel):
    name: str | None = None
    color: str | None = None
    material: str | None = None
    price_per_kg: float | None = None
    stock_grams: float | None = None
    brand: str | None = None


class FilamentOut(FilamentBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class JobBase(BaseModel):
    printer_id: int
    filename: str
    material: str | None = None
    duration_estimated: float | None = None
    duration_slicer: float | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    status: str


class JobCreate(JobBase):
    pass


class JobUpdate(BaseModel):
    printer_id: int | None = None
    filename: str | None = None
    material: str | None = None
    duration_estimated: float | None = None
    duration_slicer: float | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    status: str | None = None


class JobOut(JobBase):
    id: int

    class Config:
        from_attributes = True


class SettingBase(BaseModel):
    key: str
    value: str | None = None


class SettingCreate(SettingBase):
    pass


class SettingUpdate(BaseModel):
    key: str | None = None
    value: str | None = None


class SettingOut(SettingBase):
    id: int

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    email: str | None = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: EmailStr
    created_at: datetime

    class Config:
        from_attributes = True
