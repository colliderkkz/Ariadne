from app.models import Project, ProjectMessage
from app.services.common import owned, save


def create_message(db, owner_id, data):
    owned(db, Project, owner_id, data.project_id)
    return save(db, ProjectMessage(owner_id=owner_id, **data.model_dump()))


def update_message(db, owner_id, message_id, data):
    message = owned(db, ProjectMessage, owner_id, message_id)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(message, key, value)
    return save(db, message)
