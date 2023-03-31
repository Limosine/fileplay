export const load = ({ url }) => {
    const { pathname } = url
    
    return {
      data: pathname
    }
  }