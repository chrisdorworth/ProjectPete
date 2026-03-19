// Find all members of a household
MATCH (h:Household {id: $householdId})<-[:MEMBER_OF]-(member)
RETURN member.id AS id, member.name AS name, labels(member) AS labels
ORDER BY member.name
