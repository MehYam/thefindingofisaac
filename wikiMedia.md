# WikiMedia

The fandom wiki's WikiMedia API provides programmatic access to the wiki's data without scraping.  

https://bindingofisaacrebirth.fandom.com/api.php?action=cargoquery&tables=collectible&fields=name,description,image,is_activated,dlc&limit=5&format=json

Here are results of the 'cargofields' query, 
https://bindingofisaacrebirth.fandom.com/api.php?action=cargofields&table=collectible&format=json

# "collectible" table fields
{
  "cargofields": {
    "dlc": {
      "type": "Integer"
    },
    "alias": {
      "type": "String"
    },
    "name": {
      "type": "String"
    },
    "image": {
      "type": "String"
    },
    "id": {
      "type": "Integer"
    },
    "is_activated": {
      "type": "Boolean"
    },
    "quote": {
      "type": "String"
    },
    "description": {
      "type": "Wikitext"
    },
    "recharge": {
      "type": "String"
    },
    "quality": {
      "type": "Integer"
    },
    "tags": {
      "type": "String",
      "isList": "",
      "delimiter": " "
    },
    "shop_price": {
      "type": "String",
      "isList": "",
      "delimiter": "▼"
    },
    "devil_price": {
      "type": "String",
      "isList": "",
      "delimiter": "▼"
    },
    "unlocked_by": {
      "type": "String"
    }
  }
}

# "trinket" table fields
{
  "cargofields": {
    "dlc": {
      "type": "Integer"
    },
    "alias": {
      "type": "String"
    },
    "name": {
      "type": "String"
    },
    "image": {
      "type": "String"
    },
    "id": {
      "type": "Integer"
    },
    "quote": {
      "type": "String"
    },
    "description": {
      "type": "Wikitext"
    },
    "unlocked_by": {
      "type": "String"
    }
  }
}

# "pickup" table fields
{
  "cargofields": {
    "dlc": {
      "type": "Integer"
    },
    "alias": {
      "type": "String"
    },
    "name": {
      "type": "String"
    },
    "image": {
      "type": "String"
    },
    "id": {
      "type": "Integer"
    },
    "type": {
      "type": "String"
    },
    "quote": {
      "type": "String"
    },
    "description": {
      "type": "Wikitext"
    },
    "unlocked_by": {
      "type": "String"
    }
  }
}