import httpx
from typing import Optional, Dict, Any, List

class iFixitClient:
    BASE_URL = "https://www.ifixit.com/api/2.0"

    async def search_device(self, query: str) -> Optional[Dict[str, Any]]:
        """
        Search iFixit for a matching device.
        """
        async with httpx.AsyncClient() as client:
            # 'filter=category' ensures we find device categories, not just guides
            response = await client.get(
                f"{self.BASE_URL}/search/{query}",
                params={"filter": "category", "limit": 1}
            )
            
            if response.status_code == 200:
                results = response.json().get("results", [])
                if results:
                    return results[0] # Return best match
        return None

    async def get_guides(self, device_id: str) -> list:
        """
        Fetch official guides for a device category.
        """
        async with httpx.AsyncClient() as client:
            # Using the wiki API to get guides associated with the category
            response = await client.get(f"{self.BASE_URL}/wikis/CATEGORY/{device_id}")
            if response.status_code == 200:
                return response.json().get("guides", [])
        return []

    async def get_guide_details(self, guide_id: int) -> Dict[str, Any]:
        """
        Fetch full details of a specific guide, including steps.
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.BASE_URL}/guides/{guide_id}")
            if response.status_code == 200:
                return response.json()
        return {}
