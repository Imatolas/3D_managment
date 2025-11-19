from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..dependencies import get_current_user

router = APIRouter(prefix="/printers", tags=["printers"], dependencies=[Depends(get_current_user)])


@router.get("/", response_model=list[schemas.PrinterOut])
def list_printers(db: Session = Depends(get_db)):
    return db.query(models.Printer).order_by(models.Printer.id).all()


@router.post("/", response_model=schemas.PrinterOut, status_code=status.HTTP_201_CREATED)
def create_printer(printer: schemas.PrinterCreate, db: Session = Depends(get_db)):
    entity = models.Printer(**printer.model_dump())
    db.add(entity)
    db.commit()
    db.refresh(entity)
    return entity


@router.put("/{printer_id}", response_model=schemas.PrinterOut)
def update_printer(printer_id: int, payload: schemas.PrinterUpdate, db: Session = Depends(get_db)):
    printer = db.query(models.Printer).filter(models.Printer.id == printer_id).first()
    if not printer:
        raise HTTPException(status_code=404, detail="Impressora não encontrada")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(printer, field, value)
    db.commit()
    db.refresh(printer)
    return printer


@router.delete("/{printer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_printer(printer_id: int, db: Session = Depends(get_db)):
    printer = db.query(models.Printer).filter(models.Printer.id == printer_id).first()
    if not printer:
        raise HTTPException(status_code=404, detail="Impressora não encontrada")
    db.delete(printer)
    db.commit()
    return None
