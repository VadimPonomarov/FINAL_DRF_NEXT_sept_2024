from drf_yasg import openapi

# Pagination parameters
pagination_parameters = [
    openapi.Parameter(
        name='page',
        in_=openapi.IN_QUERY,
        description='Page number for pagination',
        type=openapi.TYPE_INTEGER
    ),
    openapi.Parameter(
        name='page_size',
        in_=openapi.IN_QUERY,
        description='Number of items per page',
        type=openapi.TYPE_INTEGER
    ),
]

# Filtering parameters
filtering_parameters = [
    openapi.Parameter(
        name='id',
        in_=openapi.IN_QUERY,
        description='Filter by ID (exact, gt, gte, lt, lte, in, range)',
        type=openapi.TYPE_STRING
    ),
    openapi.Parameter(
        name='email',
        in_=openapi.IN_QUERY,
        description='Filter by email (exact, contains)',
        type=openapi.TYPE_STRING
    ),
    openapi.Parameter(
        name='is_active',
        in_=openapi.IN_QUERY,
        description='Filter by active status (exact)',
        type=openapi.TYPE_BOOLEAN
    ),
    openapi.Parameter(
        name='is_staff',
        in_=openapi.IN_QUERY,
        description='Filter by staff status (exact)',
        type=openapi.TYPE_BOOLEAN
    ),
    openapi.Parameter(
        name='is_superuser',
        in_=openapi.IN_QUERY,
        description='Filter by superuser status (exact)',
        type=openapi.TYPE_BOOLEAN
    ),
]

# Parameters for updating avatar
update_avatar_parameters = [
    openapi.Parameter(
        name="id",
        in_=openapi.IN_PATH,
        type=openapi.TYPE_INTEGER,
        description="The user_id to identify the profile for updating the avatar."
    ),
    openapi.Parameter(
        name="avatar",
        in_=openapi.IN_FORM,
        type=openapi.TYPE_FILE,
        description="The new avatar file to be uploaded."
    ),
]

# Responses for avatar update
update_avatar_responses = {
    200: openapi.Response(
        description="Avatar updated successfully.",
        schema=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                "avatar_url": openapi.Schema(
                    type=openapi.TYPE_STRING,
                    description="The URL of the updated avatar."
                )
            },
        ),
    ),
    400: openapi.Response(
        description="Bad Request: Invalid file or user not found."
    ),
}

# Responses for avatar DELETE
delete_avatar_responses = {
    200: openapi.Response(
         description="Avatar deleted successfully.",
         schema=openapi.Schema(
             type=openapi.TYPE_OBJECT,
             properties={
                 'message': openapi.Schema(
                     type=openapi.TYPE_STRING,
                     description="Deletion confirmation message."
                 )
             }
         )
    ),
    404: "Profile not found."
}
