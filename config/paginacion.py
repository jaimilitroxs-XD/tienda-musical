from django.core.paginator import Paginator
from rest_framework.response import Response


def paginar(request, queryset, serializar, por_defecto=10, maximo=50):
    """Devuelve una página si recibe ?page=; de lo contrario, devuelve la lista completa."""
    if 'page' not in request.query_params:
        return Response(serializar(list(queryset)))
    try:
        tamano = int(request.query_params.get('page_size', por_defecto))
    except (TypeError, ValueError):
        tamano = por_defecto
    tamano = max(1, min(tamano, maximo))
    paginador = Paginator(queryset, tamano)
    pagina = paginador.get_page(request.query_params.get('page'))
    return Response({
        'count': paginador.count,
        'page': pagina.number,
        'pages': paginador.num_pages,
        'page_size': tamano,
        'results': serializar(list(pagina.object_list)),
    })


def ordenar_listado(request, queryset, campos):
    orden = request.query_params.get('ordering', '')
    campo = orden.lstrip('-')
    if campo not in campos:
        return queryset
    expresion = campos[campo]
    if orden.startswith('-'):
        expresion = '-' + expresion
    return queryset.order_by(expresion, 'pk')
