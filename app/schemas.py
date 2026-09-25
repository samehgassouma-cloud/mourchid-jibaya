"""Schémas d'entrée de l'API (validation automatique + documentation OpenAPI sur /docs)."""
from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field

Langue = Literal["ar", "fr", "en"]
Service = Literal["fisc", "controle", "recouvrement", "rne", "identite"]
Profil = Literal["pp", "lib", "art", "pm"]


class Question(BaseModel):
    question: str = Field(..., max_length=500, examples=["أنا محامي، لازمني فاتورة إلكترونية؟"])
    langue: Optional[Langue] = Field(None, description="Langue de réponse ; détectée automatiquement si absente")


class Ticket(BaseModel):
    question: str = Field(..., min_length=1, max_length=500)
    service: Service = "fisc"
    contact: str = Field("", max_length=120)


class Rappels(BaseModel):
    profil: Profil = "pp"
    mois: int = Field(6, ge=1, le=12)
    langue: Langue = "fr"
    alertes: list[Literal["j7", "j2", "j0"]] = ["j7", "j2", "j0"]


class Verification(BaseModel):
    profil: Literal["pp", "pm"] = "pp"
    periode: str = Field(..., pattern=r"^\d{4}-\d{2}$", examples=["2026-08"])
    ca_ht: float = Field(0, ge=0)
    taux: Literal[19, 13, 7] = 19
    tva_declaree: float = Field(0, ge=0)
    tva_deductible: float = Field(0, ge=0)
    date_depot: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")


class Validation(BaseModel):
    id: str
    expert: Optional[str] = None
    statut: Literal["source_officielle", "a_confirmer", "interne", "brouillon"] = "source_officielle"


class Identifiant(BaseModel):
    id: str


class Cloture(BaseModel):
    numero: int
    reponse: str = Field("", max_length=4000)
    fiche_id: Optional[str] = None


class Test(BaseModel):
    question: str = Field(..., max_length=500)
