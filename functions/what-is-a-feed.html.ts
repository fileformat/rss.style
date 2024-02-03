interface Env {
}

export const onRequest: PagesFunction<Env> = async (ctx) => {

    return Response.redirect('https://aboutfeeds.com/', 302);  // LATER: some nice content instead of a redirect

}
