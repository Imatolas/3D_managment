from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..dependencies import get_current_user

router = APIRouter(prefix="/settings", tags=["settings"], dependencies=[Depends(get_current_user)])


@router.get("/", response_model=list[schemas.SettingOut])
def list_settings(db: Session = Depends(get_db)):
    return db.query(models.Setting).order_by(models.Setting.key).all()


@router.post("/", response_model=schemas.SettingOut, status_code=status.HTTP_201_CREATED)
def create_setting(payload: schemas.SettingCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Setting).filter(models.Setting.key == payload.key).first()
    if existing:
        raise HTTPException(status_code=400, detail="Chave já cadastrada")
    setting = models.Setting(**payload.model_dump())
    db.add(setting)
    db.commit()
    db.refresh(setting)
    return setting


@router.put("/{setting_id}", response_model=schemas.SettingOut)
def update_setting(setting_id: int, payload: schemas.SettingUpdate, db: Session = Depends(get_db)):
    setting = db.get(models.Setting, setting_id)
    if not setting:
        raise HTTPException(status_code=404, detail="Configuração não encontrada")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(setting, field, value)
    db.commit()
    db.refresh(setting)
    return setting


@router.delete("/{setting_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_setting(setting_id: int, db: Session = Depends(get_db)):
    setting = db.get(models.Setting, setting_id)
    if not setting:
        raise HTTPException(status_code=404, detail="Configuração não encontrada")
    db.delete(setting)
    db.commit()
    return None
